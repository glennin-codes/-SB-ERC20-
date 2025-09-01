const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SimBankToken Upgrade", function () {
  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy V1
    const SimBankToken = await ethers.getContractFactory("SimBankToken");
    const initialSupply = ethers.parseEther("1000000");

    const token = await upgrades.deployProxy(
      SimBankToken,
      [initialSupply, owner.address],
      { initializer: "initialize", kind: "uups" }
    );

    await token.waitForDeployment();

    return { token, owner, addr1, addr2, initialSupply };
  }

  describe("Upgrade to V2", function () {
    it("Should upgrade to V2 successfully", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);

      const proxyAddress = await token.getAddress();

      // Check V1 version
      expect(await token.version()).to.equal("1.0.0");

      // Upgrade to V2
      const SimBankTokenV2 = await ethers.getContractFactory("SimBankTokenV2");
      const tokenV2 = await upgrades.upgradeProxy(
        proxyAddress,
        SimBankTokenV2,
        { kind: "uups" }
      );

      // Check V2 version
      expect(await tokenV2.version()).to.equal("2.0.0");

      // Proxy address should remain the same
      expect(await tokenV2.getAddress()).to.equal(proxyAddress);
    });

    it("Should preserve state after upgrade", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      // Transfer some tokens before upgrade
      const transferAmount = ethers.parseEther("1000");
      await token.transfer(addr1.address, transferAmount);

      const proxyAddress = await token.getAddress();
      const ownerBalanceBefore = await token.balanceOf(owner.address);
      const addr1BalanceBefore = await token.balanceOf(addr1.address);
      const totalSupplyBefore = await token.totalSupply();

      // Upgrade to V2
      const SimBankTokenV2 = await ethers.getContractFactory("SimBankTokenV2");
      const tokenV2 = await upgrades.upgradeProxy(
        proxyAddress,
        SimBankTokenV2,
        { kind: "uups" }
      );

      // Check that state is preserved
      expect(await tokenV2.balanceOf(owner.address)).to.equal(
        ownerBalanceBefore
      );
      expect(await tokenV2.balanceOf(addr1.address)).to.equal(
        addr1BalanceBefore
      );
      expect(await tokenV2.totalSupply()).to.equal(totalSupplyBefore);
      expect(await tokenV2.name()).to.equal("SimBank");
      expect(await tokenV2.symbol()).to.equal("SB");
    });

    it("Should only allow upgrader role to upgrade", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const UPGRADER_ROLE = await token.UPGRADER_ROLE();

      // Revoke upgrader role from owner
      await token.revokeRole(UPGRADER_ROLE, owner.address);

      // Try to upgrade - should fail
      const SimBankTokenV2 = await ethers.getContractFactory("SimBankTokenV2");
      await expect(
        upgrades.upgradeProxy(await token.getAddress(), SimBankTokenV2, {
          kind: "uups",
        })
      ).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("V2 Features - Staking", function () {
    async function deployAndUpgradeFixture() {
      const { token, owner, addr1, addr2, initialSupply } = await loadFixture(
        deployTokenFixture
      );

      // Upgrade to V2
      const SimBankTokenV2 = await ethers.getContractFactory("SimBankTokenV2");
      const tokenV2 = await upgrades.upgradeProxy(
        await token.getAddress(),
        SimBankTokenV2,
        { kind: "uups" }
      );

      // Initialize V2 with 10 basis points (0.1%) daily reward
      await tokenV2.initializeV2(10);

      return { tokenV2, owner, addr1, addr2, initialSupply };
    }

    it("Should allow staking tokens", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      const stakeAmount = ethers.parseEther("1000");
      await tokenV2.stake(stakeAmount);

      expect(await tokenV2.stakingBalance(owner.address)).to.equal(stakeAmount);
      expect(await tokenV2.balanceOf(await tokenV2.getAddress())).to.equal(
        stakeAmount
      );
    });

    it("Should calculate staking rewards correctly", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      const stakeAmount = ethers.parseEther("1000");
      await tokenV2.stake(stakeAmount);

      // Move time forward by 10 days
      await time.increase(10 * 24 * 60 * 60);

      // Calculate expected reward: 1000 * 0.001 * 10 = 10 tokens
      const expectedReward = ethers.parseEther("10");
      const actualReward = await tokenV2.calculateReward(owner.address);

      expect(actualReward).to.equal(expectedReward);
    });

    it("Should allow unstaking and claim rewards", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      const stakeAmount = ethers.parseEther("1000");
      await tokenV2.stake(stakeAmount);

      // Move time forward by 5 days
      await time.increase(5 * 24 * 60 * 60);

      const initialBalance = await tokenV2.balanceOf(owner.address);
      const expectedReward = ethers.parseEther("5"); // 1000 * 0.001 * 5

      await tokenV2.unstake(stakeAmount);

      const finalBalance = await tokenV2.balanceOf(owner.address);
      const actualGain = finalBalance - initialBalance;

      // Should receive staked amount + rewards
      expect(actualGain).to.equal(stakeAmount + expectedReward);
      expect(await tokenV2.stakingBalance(owner.address)).to.equal(0);
    });

    it("Should not allow staking more than balance", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      const balance = await tokenV2.balanceOf(owner.address);
      const overAmount = balance + ethers.parseEther("1");

      await expect(tokenV2.stake(overAmount)).to.be.revertedWith(
        "Insufficient balance"
      );
    });

    it("Should not allow unstaking more than staked", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      const stakeAmount = ethers.parseEther("1000");
      await tokenV2.stake(stakeAmount);

      const overAmount = stakeAmount + ethers.parseEther("1");

      await expect(tokenV2.unstake(overAmount)).to.be.revertedWith(
        "Insufficient staked balance"
      );
    });

    it("Should accumulate rewards when staking multiple times", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      // First stake
      await tokenV2.stake(ethers.parseEther("1000"));

      // Move time forward by 5 days
      await time.increase(5 * 24 * 60 * 60);

      // Second stake - should mint pending rewards
      const balanceBefore = await tokenV2.balanceOf(owner.address);
      await tokenV2.stake(ethers.parseEther("500"));
      const balanceAfter = await tokenV2.balanceOf(owner.address);

      // Should have received 5 tokens as reward (1000 * 0.001 * 5)
      const rewardReceived =
        balanceBefore - balanceAfter + ethers.parseEther("500");
      expect(rewardReceived).to.equal(ethers.parseEther("5"));

      // Total staked should be 1500
      expect(await tokenV2.stakingBalance(owner.address)).to.equal(
        ethers.parseEther("1500")
      );
    });

    it("Should allow admin to update staking reward rate", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      // Update to 20 basis points (0.2% daily)
      await tokenV2.setStakingRewardRate(20);

      expect(await tokenV2.stakingRewardRate()).to.equal(20);

      // Stake and check new reward rate
      const stakeAmount = ethers.parseEther("1000");
      await tokenV2.stake(stakeAmount);

      await time.increase(5 * 24 * 60 * 60);

      // Expected reward: 1000 * 0.002 * 5 = 10 tokens
      const expectedReward = ethers.parseEther("10");
      const actualReward = await tokenV2.calculateReward(owner.address);

      expect(actualReward).to.equal(expectedReward);
    });

    it("Should not allow reward rate above 1% daily", async function () {
      const { tokenV2 } = await loadFixture(deployAndUpgradeFixture);

      await expect(
        tokenV2.setStakingRewardRate(101) // 1.01%
      ).to.be.revertedWith("Reward rate too high");
    });

    it("Should show correct total staked amount", async function () {
      const { tokenV2, owner, addr1 } = await loadFixture(
        deployAndUpgradeFixture
      );

      // Transfer tokens to addr1
      await tokenV2.transfer(addr1.address, ethers.parseEther("5000"));

      // Both stake different amounts
      await tokenV2.stake(ethers.parseEther("1000"));
      await tokenV2.connect(addr1).stake(ethers.parseEther("2000"));

      expect(await tokenV2.totalStaked()).to.equal(ethers.parseEther("3000"));
    });

    it("Should handle staking when paused", async function () {
      const { tokenV2, owner } = await loadFixture(deployAndUpgradeFixture);

      await tokenV2.pause();

      await expect(
        tokenV2.stake(ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(tokenV2, "EnforcedPause");

      await tokenV2.unpause();

      // Should work after unpausing
      await tokenV2.stake(ethers.parseEther("1000"));
      expect(await tokenV2.stakingBalance(owner.address)).to.equal(
        ethers.parseEther("1000")
      );
    });
  });

  describe("V2 Backward Compatibility", function () {
    async function deployAndUpgradeFixture() {
      const { token, owner, addr1, addr2, initialSupply } = await loadFixture(
        deployTokenFixture
      );

      const SimBankTokenV2 = await ethers.getContractFactory("SimBankTokenV2");
      const tokenV2 = await upgrades.upgradeProxy(
        await token.getAddress(),
        SimBankTokenV2,
        { kind: "uups" }
      );

      await tokenV2.initializeV2(10);

      return { tokenV2, owner, addr1, addr2, initialSupply };
    }

    it("Should maintain all V1 functionality", async function () {
      const { tokenV2, owner, addr1 } = await loadFixture(
        deployAndUpgradeFixture
      );

      // Test transfer
      await tokenV2.transfer(addr1.address, ethers.parseEther("100"));
      expect(await tokenV2.balanceOf(addr1.address)).to.equal(
        ethers.parseEther("100")
      );

      // Test minting
      await tokenV2.mint(addr1.address, ethers.parseEther("100"));
      expect(await tokenV2.balanceOf(addr1.address)).to.equal(
        ethers.parseEther("200")
      );

      // Test burning
      await tokenV2.connect(addr1).burn(ethers.parseEther("50"));
      expect(await tokenV2.balanceOf(addr1.address)).to.equal(
        ethers.parseEther("150")
      );

      // Test pausing
      await tokenV2.pause();
      await expect(
        tokenV2.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(tokenV2, "EnforcedPause");
      await tokenV2.unpause();

      // Test blacklisting
      await tokenV2.blacklist(addr1.address);
      await expect(
        tokenV2.connect(addr1).transfer(owner.address, ethers.parseEther("50"))
      ).to.be.revertedWith("Sender is blacklisted");
    });
  });
});
