import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ZenithMallModule", (m) => {
  const mockUSDC = "0x036CbD5842c542663e4792541eC2318f3dCF7e";
  const escrow = m.contract("ZenithMallEscrow", [mockUSDC]);
  return { escrow };
});
