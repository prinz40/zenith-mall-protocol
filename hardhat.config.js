import "@nomicfoundation/hardhat-ethers";
import dotenv from "dotenv";
dotenv.config();
const pkRaw = process.env.PRIVATE_KEY || "";
const pk = pkRaw ? (pkRaw.startsWith("0x") ? pkRaw : "0x"+pkRaw) : "";
export default {
  solidity: "0.8.20",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: pk ? [pk] : []
    }
  }
};
