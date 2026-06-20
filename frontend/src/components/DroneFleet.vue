<script setup lang="ts">
import { useDroneStore } from '../store/drone';
import { PAYLOADS } from '../utils/pathfinding';
import type { PayloadType } from '../types';

const store = useDroneStore();

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function batteryColor(pct: number): string {
  if (pct < 50) return '#22c55e';
  if (pct < 80) return '#eab308';
  return '#ef4444';
}

function segmentProportion(distance: number): number {
  if (!store.fleetTotalDistance) return 0;
  return (distance / store.fleetTotalDistance) * 100;
}

function onPayloadChange(droneId: string, e: Event) {
  const value = (e.target as HTMLSelectElement).value as PayloadType;
  store.assignPayload(droneId, value);
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-3 space-y-3">
    <div class="flex items-center justify-between border-b border-slate-700 pb-2">
      <h3 class="text-sm font-bold text-slate-200">多机协同巡检</h3>
      <span class="text-[10px] text-slate-500">{{ store.droneFleet.length }} 架</span>
    </div>

    <div v-if="store.droneFleet.length === 0" class="text-[11px] text-slate-500 py-2 text-center">
      规划航线后点击「拆分航线」分配多机任务负载
    </div>

    <template v-else>
      <!-- Fleet summary -->
      <div class="grid grid-cols-3 gap-1 text-[10px]">
        <div class="bg-slate-900 rounded p-1.5">
          <div class="text-slate-400">协同总距</div>
          <div class="text-xs font-bold text-sky-400">
            {{ (store.fleetTotalDistance / 1000).toFixed(2) }}<span class="text-slate-500"> km</span>
          </div>
        </div>
        <div class="bg-slate-900 rounded p-1.5">
          <div class="text-slate-400">最长用时</div>
          <div class="text-xs font-bold text-sky-400">{{ formatTime(store.fleetMaxTime) }}</div>
        </div>
        <div class="bg-slate-900 rounded p-1.5">
          <div class="text-slate-400">峰值电量</div>
          <div class="text-xs font-bold" :style="{ color: batteryColor(store.fleetMaxBattery) }">
            {{ store.fleetMaxBattery.toFixed(1) }}%
          </div>
        </div>
      </div>

      <!-- Drone list -->
      <div class="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        <div
          v-for="(drone, i) in store.droneFleet"
          :key="drone.id"
          class="bg-slate-900 rounded-lg p-2.5 border-l-2"
          :style="{ borderColor: drone.color }"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full"
                :style="{ backgroundColor: drone.color }"
              />
              <span class="text-xs font-semibold text-slate-200">{{ drone.name }}</span>
            </div>
            <select
              :value="drone.payload.type"
              @change="onPayloadChange(drone.id, $event)"
              class="bg-slate-700 text-slate-100 text-[10px] rounded px-1 py-0.5 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option v-for="p in PAYLOADS" :key="p.type" :value="p.type">
                {{ p.icon }} {{ p.name }}
              </option>
            </select>
          </div>

          <!-- Payload badge -->
          <div class="flex items-center gap-1.5 mb-2 text-[10px]">
            <span
              class="px-1.5 py-0.5 rounded font-medium"
              :style="{
                backgroundColor: drone.payload.color + '22',
                color: drone.payload.color,
              }"
            >
              {{ drone.payload.icon }} {{ drone.payload.name }}
            </span>
            <span class="text-slate-500">{{ drone.payload.description }}</span>
          </div>

          <!-- Per-drone stats -->
          <div class="grid grid-cols-3 gap-1 text-[10px] mb-2">
            <div class="text-slate-400">
              距离
              <div class="text-slate-200 font-semibold">
                {{ (drone.stats.distance / 1000).toFixed(2) }}<span class="text-slate-500"> km</span>
              </div>
            </div>
            <div class="text-slate-400">
              用时
              <div class="text-slate-200 font-semibold">{{ formatTime(drone.stats.estimatedTime) }}</div>
            </div>
            <div class="text-slate-400">
              电量
              <div class="font-semibold" :style="{ color: batteryColor(drone.stats.batteryUsage) }">
                {{ drone.stats.batteryUsage.toFixed(1) }}%
              </div>
            </div>
          </div>

          <!-- Segment proportion bar -->
          <div class="mb-1.5">
            <div class="flex justify-between text-[9px] text-slate-500 mb-0.5">
              <span>航段占比</span>
              <span>{{ segmentProportion(drone.stats.distance).toFixed(0) }}% · {{ drone.waypoints.length }} 点</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-1.5">
              <div
                class="h-1.5 rounded-full transition-all"
                :style="{
                  width: segmentProportion(drone.stats.distance) + '%',
                  backgroundColor: drone.color,
                }"
              />
            </div>
          </div>

          <!-- Multi-drone sim progress -->
          <div v-if="store.isMultiSimulating || (store.multiSimProgress[i] > 0 && store.multiSimProgress[i] < 100)">
            <div class="flex justify-between text-[9px] text-slate-500 mb-0.5">
              <span>巡检进度</span>
              <span>{{ store.multiSimProgress[i] ?? 0 }}%</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-1.5">
              <div
                class="h-1.5 rounded-full transition-all"
                :style="{
                  width: (store.multiSimProgress[i] ?? 0) + '%',
                  backgroundColor: drone.color,
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
