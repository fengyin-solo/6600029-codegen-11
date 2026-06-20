import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Waypoint, NoFlyZone, TerrainPoint, FlightPlan, DroneConfig, DroneUnit, PayloadType } from '../types';
import {
  aStarPathfind,
  rrtPathfind,
  smoothPath,
  calculateFlightStats,
  checkTerrainCollision,
  exportKML,
  mockNoFlyZones,
  mockTerrainData,
  splitPathByDistance,
  DRONE_COLORS,
  PAYLOADS,
} from '../utils/pathfinding';

export const useDroneStore = defineStore('drone', () => {
  const waypoints = ref<Waypoint[]>([]);
  const noFlyZones = ref<NoFlyZone[]>([]);
  const terrainData = ref<TerrainPoint[]>([]);
  const currentPlan = ref<FlightPlan | null>(null);
  const selectedAlgorithm = ref<'astar' | 'rrt'>('astar');
  const isSimulating = ref(false);
  const simProgress = ref(0);
  const mapCenter = ref<[number, number]>([39.9, 116.4]);

  const droneConfig = ref<DroneConfig>({
    maxAltitude: 500,
    maxSpeed: 20,
    batteryCapacity: 5000,
    consumptionRate: 100,
    safeDistance: 30,
  });

  const droneFleet = ref<DroneUnit[]>([]);
  const droneCount = ref(3);
  const isMultiDroneMode = ref(false);
  const multiSimProgress = ref<number[]>([]);
  const isMultiSimulating = ref(false);
  let multiSimInterval: ReturnType<typeof setInterval> | null = null;

  // ─── Actions ──────────────────────────────────────────────────────────────
  function addWaypoint(
    lat: number,
    lng: number,
    altitude = 100,
    speed = 10,
    action: Waypoint['action'] = 'none'
  ) {
    const id = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    waypoints.value.push({ id, lat, lng, altitude, speed, action });
  }

  function removeWaypoint(id: string) {
    waypoints.value = waypoints.value.filter((w) => w.id !== id);
  }

  function updateWaypoint(id: string, updates: Partial<Waypoint>) {
    const wp = waypoints.value.find((w) => w.id === id);
    if (wp) Object.assign(wp, updates);
  }

  function planRoute(start: [number, number], goal: [number, number]) {
    const bounds = { minLat: 39.85, maxLat: 39.95, minLng: 116.35, maxLng: 116.45 };
    let raw: Waypoint[];
    if (selectedAlgorithm.value === 'astar') {
      raw = aStarPathfind(start, goal, 30, noFlyZones.value, bounds);
    } else {
      raw = rrtPathfind(start, goal, noFlyZones.value);
    }
    const smoothed = smoothPath(raw);
    waypoints.value = smoothed;
    clearFleet();
    updatePlan();
  }

  function clearRoute() {
    waypoints.value = [];
    currentPlan.value = null;
    simProgress.value = 0;
    clearFleet();
  }

  function updatePlan() {
    const stats = calculateFlightStats(waypoints.value, droneConfig.value);
    currentPlan.value = {
      id: `plan-${Date.now()}`,
      name: 'Flight Plan',
      waypoints: [...waypoints.value],
      totalDistance: stats.totalDistance,
      estimatedTime: stats.estimatedTime,
      batteryUsage: stats.batteryUsage,
    };
  }

  let simInterval: ReturnType<typeof setInterval> | null = null;

  function simulateFlight() {
    if (waypoints.value.length < 2 || isSimulating.value) return;
    isSimulating.value = true;
    simProgress.value = 0;
    simInterval = setInterval(() => {
      simProgress.value += 1;
      if (simProgress.value >= 100) {
        simProgress.value = 100;
        isSimulating.value = false;
        if (simInterval) clearInterval(simInterval);
      }
    }, 50);
  }

  // ─── Multi-Drone Collaborative Inspection ────────────────────────────────
  function setDroneCount(n: number) {
    droneCount.value = Math.max(2, Math.min(6, Math.round(n)));
  }

  async function splitRouteAmongDrones(count?: number, useBackend = false) {
    if (waypoints.value.length < 2) return;
    const n = Math.max(2, Math.min(6, count ?? droneCount.value));
    droneCount.value = n;

    if (useBackend) {
      try {
        const response = await fetch('http://localhost:8080/api/route/split', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waypoints: waypoints.value,
            droneCount: n,
          }),
        });
        const data = await response.json();
        droneFleet.value = data.fleet as DroneUnit[];
      } catch (e) {
        console.warn('Backend unavailable, using local split algorithm', e);
        const segments = splitPathByDistance(waypoints.value, n);
        droneFleet.value = segments.map((seg, i) => {
          const stats = calculateFlightStats(seg, droneConfig.value);
          return {
            id: `drone-${Date.now()}-${i}`,
            name: `巡检机 ${i + 1}`,
            color: DRONE_COLORS[i % DRONE_COLORS.length],
            waypoints: seg,
            payload: PAYLOADS[i % PAYLOADS.length],
            stats: {
              distance: stats.totalDistance,
              estimatedTime: stats.estimatedTime,
              batteryUsage: stats.batteryUsage,
            },
          } as DroneUnit;
        });
      }
    } else {
      const segments = splitPathByDistance(waypoints.value, n);
      droneFleet.value = segments.map((seg, i) => {
        const stats = calculateFlightStats(seg, droneConfig.value);
        return {
          id: `drone-${Date.now()}-${i}`,
          name: `巡检机 ${i + 1}`,
          color: DRONE_COLORS[i % DRONE_COLORS.length],
          waypoints: seg,
          payload: PAYLOADS[i % PAYLOADS.length],
          stats: {
            distance: stats.totalDistance,
            estimatedTime: stats.estimatedTime,
            batteryUsage: stats.batteryUsage,
          },
        } as DroneUnit;
      });
    }

    isMultiDroneMode.value = true;
    multiSimProgress.value = droneFleet.value.map(() => 0);
  }

  function clearFleet() {
    droneFleet.value = [];
    isMultiDroneMode.value = false;
    multiSimProgress.value = [];
    if (multiSimInterval) {
      clearInterval(multiSimInterval);
      multiSimInterval = null;
    }
    isMultiSimulating.value = false;
  }

  function assignPayload(droneId: string, type: PayloadType) {
    const drone = droneFleet.value.find((d) => d.id === droneId);
    if (!drone) return;
    const payload = PAYLOADS.find((p) => p.type === type);
    if (payload) drone.payload = payload;
  }

  function simulateMultiDroneFlight() {
    if (droneFleet.value.length === 0) return;
    multiSimProgress.value = droneFleet.value.map(() => 0);
    if (multiSimInterval) clearInterval(multiSimInterval);
    isMultiSimulating.value = true;
    multiSimInterval = setInterval(() => {
      let allDone = true;
      multiSimProgress.value = multiSimProgress.value.map((p) => {
        if (p >= 100) return 100;
        allDone = false;
        return Math.min(100, p + 1);
      });
      if (allDone && multiSimInterval) {
        clearInterval(multiSimInterval);
        multiSimInterval = null;
        isMultiSimulating.value = false;
      }
    }, 50);
  }

  function loadMockData() {
    noFlyZones.value = mockNoFlyZones;
    terrainData.value = mockTerrainData;
  }

  function exportPlan(): string {
    if (!currentPlan.value) return '';
    return exportKML(currentPlan.value);
  }

  // ─── Computed ─────────────────────────────────────────────────────────────
  const totalDistance = computed(() => {
    if (!currentPlan.value) return 0;
    return currentPlan.value.totalDistance;
  });

  const estimatedTime = computed(() => {
    if (!currentPlan.value) return 0;
    return currentPlan.value.estimatedTime;
  });

  const batteryPercent = computed(() => {
    if (!currentPlan.value) return 0;
    return currentPlan.value.batteryUsage;
  });

  const terrainProfile = computed(() => {
    if (waypoints.value.length < 2) return [];
    return waypoints.value.map((wp) => {
      let nearestElev = 0;
      let minDist = Infinity;
      for (const tp of terrainData.value) {
        const d =
          (tp.lat - wp.lat) ** 2 + (tp.lng - wp.lng) ** 2;
        if (d < minDist) {
          minDist = d;
          nearestElev = tp.elevation;
        }
      }
      return {
        lat: wp.lat,
        lng: wp.lng,
        altitude: wp.altitude,
        terrainElevation: nearestElev,
      };
    });
  });

  const fleetTotalDistance = computed(() =>
    droneFleet.value.reduce((sum, d) => sum + d.stats.distance, 0)
  );

  const fleetMaxTime = computed(() =>
    Math.max(0, ...droneFleet.value.map((d) => d.stats.estimatedTime))
  );

  const fleetMaxBattery = computed(() =>
    Math.max(0, ...droneFleet.value.map((d) => d.stats.batteryUsage))
  );

  return {
    waypoints,
    noFlyZones,
    terrainData,
    currentPlan,
    droneConfig,
    selectedAlgorithm,
    isSimulating,
    simProgress,
    mapCenter,
    totalDistance,
    estimatedTime,
    batteryPercent,
    terrainProfile,
    droneFleet,
    droneCount,
    isMultiDroneMode,
    multiSimProgress,
    isMultiSimulating,
    fleetTotalDistance,
    fleetMaxTime,
    fleetMaxBattery,
    addWaypoint,
    removeWaypoint,
    updateWaypoint,
    planRoute,
    clearRoute,
    simulateFlight,
    loadMockData,
    exportPlan,
    updatePlan,
    setDroneCount,
    splitRouteAmongDrones,
    clearFleet,
    assignPayload,
    simulateMultiDroneFlight,
  };
});
