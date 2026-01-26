import { sizingConstraints } from './hardwareConfig.js';

export function calculateUsableStorage(nodes, disksPerNode, diskSizeTB, resiliency) {
  const safeNodes = parseInt(nodes, 10);
  const safeDisks = parseInt(disksPerNode, 10);
  const safeDiskSize = parseFloat(diskSizeTB);
  

  if (!safeNodes || !safeDisks || !safeDiskSize || !resiliency) {
    return {
      rawTB: "0.00",
      reservedTB: "0.00",
      resiliencyTB: "0.00",
      usableTB: "0.00",
      usableTiB: "0.00",
      resiliencyTiB: "0.00",
      reserveTiB: "0.00"
    };
  }

  const totalDisks = safeNodes * safeDisks;
  const rawTB = totalDisks * safeDiskSize;

  // Reserve = 1 disk per node, up to 4 nodes max
  const clusterSize = sizingConstraints.maxClusterSize || 7;
  const clusterCount = Math.ceil(safeNodes / clusterSize);
  const reservedDiskCount = Math.min(safeNodes, 4);
  const reservedTB = reservedDiskCount * safeDiskSize;

  const usableAfterReserve = rawTB - reservedTB;

  let usableTB = 0;
  let resiliencyTB = 0;

  switch (resiliency) {
    case "2-way":
      usableTB = usableAfterReserve / 2;
      break;
    case "3-way":
      usableTB = usableAfterReserve / 3;
      break;
    case "4-way":
      usableTB = usableAfterReserve / 4;
      break;
    default:
      usableTB = usableAfterReserve;
  }

  resiliencyTB = usableAfterReserve - usableTB;

  const usableTiB = usableTB / 1.1024;
  const resiliencyTiB = resiliencyTB / 1.1024;



  return {
    rawTB: rawTB.toFixed(2),
    reservedTB: reservedTB.toFixed(2),
    resiliencyTB: resiliencyTB.toFixed(2),
    usableTB: usableTB.toFixed(2),
    usableTiB: usableTiB.toFixed(2),
    resiliencyTiB: resiliencyTiB.toFixed(2),
    reserveTiB: (reservedTB / 1.1024).toFixed(2)
  };
}