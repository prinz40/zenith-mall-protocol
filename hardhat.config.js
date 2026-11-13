// Zenith Mall Protocol - Hardhat v2 - Sepolia + Base Sepolia
// Escrow v2: ZenithMallEscrow - 90/10 - Solidity 0.8.20

import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";
dotenv.config();

const pkRaw = process.env.PRIVATE_KEY || "";
const pk = pkRaw ? (pkRaw.startsWith("0x") ? pkRaw : "0x" + pkRaw) : "";

// RPC - Use .env first, fallback to public node
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // FIXED v2 - THIS WAS MISSING! Deploy + Test use --network sepolia
    sepolia: {
      url: SEPOLIA_RPC,
      chainId: 11155111,
      accounts: pk ? [pk] : [],
    },
    // Keep Base Sepolia for future - Do NOT delete
    baseSepolia: {
      url: BASE_SEPOLIA_RPC,
      chainId: 84532,
      accounts: pk ? [pk] : [],
    },
    // Local test - For fast test without SepoliaETH
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    // For npx hardhat verify --network sepolia <address> <USDC>
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
