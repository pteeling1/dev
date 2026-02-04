/**
 * Component SKUs - CPU, Memory, Storage, Networking
 * Maintained separately for easy updates without code changes
 */

export const componentSKUs = {
  cpus: {
    "Intel Xeon 6 Performance 6505P": {
      sku: "338-CTBJ",
      description: "Intel Xeon 6 Performance 6505P 2.2G, 12C/24T, 24GT/s, 48M Cache, Turbo, (150W)"
    },
    "Intel Xeon 6 Performance 6507P": {
      sku: "338-CTBK",
      description: "Intel Xeon 6 Performance 6507P 3.5G, 8C/16T, 24GT/s, 48M Cache, Turbo, (150W)"
    },
    "Intel Xeon 6 Performance 6515P": {
      sku: "338-CTBF",
      description: "Intel Xeon 6 Performance 6515P 2.3G, 16C/32T, 24GT/s, 72M Cache, Turbo, (150W)"
    },
    "Intel Xeon 6 Performance 6517P": {
      sku: "338-CTBD",
      description: "Intel Xeon 6 Performance 6517P 3.2G, 16C/32T, 24GT/s, 72M Cache, Turbo, (190W)"
    },
    "Intel Xeon 6 Performance 6520P": {
      sku: "338-CSZZ",
      description: "Intel Xeon 6 Performance 6520P 2.4G, 24C/48T, 24GT/s, 144M Cache, Turbo, (210W)"
    },
    "Intel Xeon 6 Performance 6527P": {
      sku: "338-CSZY",
      description: "Intel Xeon 6 Performance 6527P 3.0G, 24C/48T, 24GT/s, 144M Cache, Turbo, (255W)"
    },
    "Intel Xeon 6 Performance 6530P": {
      sku: "338-CTBG",
      description: "Intel Xeon 6 Performance 6530P 2.3G, 32C/64T, 24GT/s, 144M Cache, Turbo, (225W)"
    },
    "Intel Xeon 6 Performance 6714P": {
      sku: "338-CTBP",
      description: "Intel Xeon 6 Performance 6714P 4.0G, 8C/16T, 24GT/s, 48M Cache, Turbo, (165W)"
    },
    "Intel Xeon 6 Performance 6724P": {
      sku: "338-CTBH",
      description: "Intel Xeon 6 Performance 6724P 3.6G, 16C/32T, 24GT/s, 72M Cache, Turbo, (210W)"
    },
    "Intel Xeon 6 Performance 6730P": {
      sku: "338-CSKF",
      description: "Intel Xeon 6 Performance 6730P 2.5G, 32C/64T, 24GT/s, 288M Cache, Turbo, (250W)"
    },
    "Intel Xeon 6 Performance 6736P": {
      sku: "338-CTBN",
      description: "Intel Xeon 6 Performance 6736P 2.0G, 36C/72T, 24GT/s, 144M Cache, Turbo, (205W)"
    },
    "Intel Xeon 6 Performance 6737P": {
      sku: "338-CTBB",
      description: "Intel Xeon 6 Performance 6737P 2.9G, 32C/64T, 24GT/s, 144M Cache, Turbo, (270W)"
    },
    "Intel Xeon 6 Performance 6740P": {
      sku: "338-CSTY",
      description: "Intel Xeon 6 Performance 6740P 2.1G, 48C/96T, 24GT/s, 288M Cache, Turbo, (270W)"
    },
    "Intel Xeon 6 Performance 6747P": {
      sku: "338-CSKK",
      description: "Intel Xeon 6 Performance 6747P 2.7G, 48C/96T, 24GT/s, 288M Cache, Turbo, (330W)"
    },
    "Intel Xeon 6 Performance 6760P": {
      sku: "338-CSTX",
      description: "Intel Xeon 6 Performance 6760P 2.2G, 64C/128T, 24GT/s, 320M Cache, Turbo, (330W)"
    },
    "Intel Xeon Platinum 8568Y+": {
      sku: "338-CPCP",
      description: "Intel Xeon Platinum 8568Y+ 2.3G, 48C/96T, 20GT/s, 300M Cache, Turbo (350W)"
    }
  },
  memory: {
    "16GB": {
      sku: "370-BDBN",
      description: "16GB RDIMM 6400MT/s, Single Rank - HCI"
    },
    "32GB": {
      sku: "370-BDBP",
      description: "32GB RDIMM, 6400MT/s, Dual Rank - HCI"
    },
    "64GB": {
      sku: "370-BDBL",
      description: "64GB RDIMM, 6400MT/s, Dual Rank - HCI"
    },
    "128GB": {
      sku: "370-BDBM",
      description: "128GB RDIMM, 6400MT/s, Dual Rank - HCI"
    }
  },
  storage: {
    "1.6TB": {
      sku: "345-BKLQ",
      description: "1.6TB Data Center NVMe Mixed Use AG Drive E3s Gen5 with carrier"
    },
    "1.92TB": {
      sku: "345-BKFR",
      description: "1.92TB Data Center NVMe Read Intensive AG Drive E3s Gen5 with carrier"
    },
    "3.2TB": {
      sku: "345-BKFS",
      description: "3.2TB Data Center NVMe Mixed Use AG Drive E3s Gen5 with carrier"
    },
    "3.84TB": {
      sku: "345-BKLR",
      description: "3.84TB Data Center NVMe Read Intensive AG Drive E3s Gen5 with carrier"
    },
    "6.4TB": {
      sku: "345-BKBF",
      description: "6.4TB NVMe Mixed Use AG Drive E3s Gen5 with carrier"
    },
    "7.68TB": {
      sku: "400-BOMO",
      description: "7.68TB NVMe Read Intensive AG Drive E3s Gen5 with carrier"
    },
    "15.36TB": {
      sku: "345-BKBJ",
      description: "15.36TB NVMe Read Intensive AG Drive E3s Gen5 with carrier"
    }
  },
  networking: {
    "ConnectX-6 Lx 25GbE OCP": {
      sku: "540-BFLP",
      description: "NVIDIA ConnectX-6 Lx Dual Port 25GbE SFP28 Adapter, OCP 3.0 NIC"
    },
    "ConnectX-6 Dx 100GbE PCIe": {
      sku: "540-BFLQ",
      description: "NVIDIA ConnectX-6 Dx Dual Port 100GbE QSFP56 Adapter, No Crypto, PCIe Low Profile"
    },
    "ConnectX-6 Dx 100GbE OCP": {
      sku: "540-BFLL",
      description: "NVIDIA ConnectX-6 Dx Dual Port 100GbE QSFP56 Adapter, No Crypto, OCP 3.0 NIC"
    }
  }
};
