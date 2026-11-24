/**
 * Utilitário de cálculo de layout de sobreposição para a Agenda
 * 
 * Implementa o algoritmo de agrupamento conexo e coloração gulosa de intervalos
 * (utilizado pelo Google Calendar / FullCalendar) para garantir que agendamentos
 * simultâneos ou conflitantes (como encaixes forçados) fiquem lado a lado horizontalmente,
 * ocupando colunas paralelas independentes e nunca se ocultando uns sobre os outros.
 */

export interface PositionedCalendarItem<T> {
  item: T;
  topPixels: number;
  heightPixels: number;
  startMinutes: number;
  endMinutes: number;
  columnIndex: number;
  totalColumns: number;
  colSpan: number;
  leftPercent: number;
  widthPercent: number;
  hasOverlap: boolean;
}

export interface OverlappableItem {
  id: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
}

export const START_OF_DAY_MINUTES = 7 * 60; // 07:00 = 420 mins
export const DEFAULT_SLOT_HEIGHT = 48; // 48px por slot de 30 minutos

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calcula a posição e largura de cada item na coluna, dividindo o espaço
 * horizontal quando houver sobreposição e restaurando a largura total (100%)
 * quando o período de sobreposição terminar.
 */
export function computeOverlappingLayout<T extends OverlappableItem>(
  items: T[],
  slotHeight: number = DEFAULT_SLOT_HEIGHT,
  startOfDayMinutes: number = START_OF_DAY_MINUTES
): PositionedCalendarItem<T>[] {
  if (!items || items.length === 0) return [];

  // 1. Normalizar horários de início e fim em minutos
  const normalized = items.map(item => {
    const startMinutes = timeToMinutes(item.startTime);
    const duration = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : 30;
    let endMinutes = item.endTime ? timeToMinutes(item.endTime) : (startMinutes + duration);

    // Se o horário de término for menor ou igual ao de início, ajusta pela duração mínima (15m)
    if (endMinutes <= startMinutes) {
      endMinutes = startMinutes + Math.max(15, duration);
    }

    const visualDuration = Math.max(25, endMinutes - startMinutes);
    const topPixels = Math.max(0, ((startMinutes - startOfDayMinutes) / 30) * slotHeight);
    const heightPixels = Math.max(38, (visualDuration / 30) * slotHeight - 3);

    return {
      item,
      startMinutes,
      endMinutes,
      topPixels,
      heightPixels,
      columnIndex: 0,
      totalColumns: 1,
      colSpan: 1,
    };
  });

  // 2. Ordenar por horário inicial (ascendente), depois por duração maior primeiro, depois id
  normalized.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    if (a.endMinutes !== b.endMinutes) return b.endMinutes - a.endMinutes;
    return a.item.id.localeCompare(b.item.id);
  });

  // 3. Agrupar em componentes conexos (clusters de sobreposição)
  const clusters: (typeof normalized)[] = [];
  let currentCluster: typeof normalized = [];
  let currentClusterEnd = -1;

  for (const entry of normalized) {
    if (currentCluster.length === 0) {
      currentCluster.push(entry);
      currentClusterEnd = entry.endMinutes;
    } else if (entry.startMinutes < currentClusterEnd) {
      // Há sobreposição direta ou encadeada com o cluster ativo
      currentCluster.push(entry);
      currentClusterEnd = Math.max(currentClusterEnd, entry.endMinutes);
    } else {
      // O horário deixou de se sobrepor: fecha o cluster anterior e inicia novo
      clusters.push(currentCluster);
      currentCluster = [entry];
      currentClusterEnd = entry.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. Para cada cluster, alocar colunas paralelas independentes
  const positionedItems: PositionedCalendarItem<T>[] = [];

  for (const cluster of clusters) {
    // Array de colunas do cluster: columns[c] armazena itens colocados na coluna c
    const columns: (typeof normalized)[] = [];

    for (const entry of cluster) {
      let placedColumn = -1;
      for (let c = 0; c < columns.length; c++) {
        const colItems = columns[c];
        const lastInCol = colItems[colItems.length - 1];
        // Se o último item da coluna c já terminou quando este começar, reutiliza a coluna
        if (lastInCol.endMinutes <= entry.startMinutes) {
          colItems.push(entry);
          placedColumn = c;
          break;
        }
      }
      if (placedColumn === -1) {
        columns.push([entry]);
        placedColumn = columns.length - 1;
      }
      entry.columnIndex = placedColumn;
    }

    const totalColumns = columns.length;

    // 5. Expansão horizontal inteligente (colSpan): se colunas à direita estiverem livres durante seu intervalo
    for (const entry of cluster) {
      let colSpan = 1;
      for (let c = entry.columnIndex + 1; c < totalColumns; c++) {
        const hasCollision = columns[c].some(
          other => entry.startMinutes < other.endMinutes && entry.endMinutes > other.startMinutes
        );
        if (!hasCollision) {
          colSpan++;
        } else {
          break;
        }
      }

      entry.colSpan = colSpan;
      entry.totalColumns = totalColumns;

      const leftPercent = (entry.columnIndex / totalColumns) * 100;
      const widthPercent = (colSpan / totalColumns) * 100;

      positionedItems.push({
        item: entry.item,
        topPixels: entry.topPixels,
        heightPixels: entry.heightPixels,
        startMinutes: entry.startMinutes,
        endMinutes: entry.endMinutes,
        columnIndex: entry.columnIndex,
        totalColumns,
        colSpan,
        leftPercent,
        widthPercent,
        hasOverlap: totalColumns > 1,
      });
    }
  }

  return positionedItems;
}
