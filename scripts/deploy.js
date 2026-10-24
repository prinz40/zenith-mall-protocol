import hre from "hardhat";
async function main() {
  console.log("Deploying ZenithMall to Base Sepolia...");
  const ZenithMall = await hre.ethers.getContractFactory("ZenithMall");
  const mall = await ZenithMall.deploy();
  await mall.waitForDeployment();
  const addr = await mall.getAddress();
  console.log("✅ ZENITH MALL DEPLOYED TO:", addr);
}
main().catch((e)=>{console.error(e); process.exit(1);});
