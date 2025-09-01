const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SimBankToken", function () {
  // Define fixture for deployment
  async function deployTokenFixture() {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const SimBankToken = await ethers.getContractFactory("SimBankToken");
    const initialSupply = ethers.parseEther("1000000"); // 1 million tokens

    const token = await upgrades.deployProxy(
      SimBankToken,
      [initialSupply, owner.address],
      { initializer: "initialize", kind: "uups" }
    );

    await token.waitForDeployment();

    return { token, owner, addr1, addr2, addr3, initialSupply };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("SimBank");
      expect(await token.symbol()).to.equal("SB");
    });

    it("Should mint initial supply to owner", async function () {
      const { token, owner, initialSupply } = await loadFixture(
        deployTokenFixture
      );
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("Should grant all roles to owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);

      const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await token.MINTER_ROLE();
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      const UPGRADER_ROLE = await token.UPGRADER_ROLE();

      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
    });

    it("Should have correct version", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.version()).to.equal("1.0.0");
    });
  });

  describe("Token Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseEther("100");
      await token.transfer(addr1.address, amount);

      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(
        ethers.parseEther("999900")
      );
    });

    it("Should emit Transfer event", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseEther("100");
      await expect(token.transfer(addr1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const initialBalance = await token.balanceOf(addr1.address);
      await expect(
        token.connect(addr1).transfer(owner.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint new tokens", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const mintAmount = ethers.parseEther("1000");
      await token.mint(addr1.address, mintAmount);

      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-minter to mint tokens", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);

      const mintAmount = ethers.parseEther("1000");
      const MINTER_ROLE = await token.MINTER_ROLE();

      await expect(
        token.connect(addr1).mint(addr1.address, mintAmount)
      ).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should not mint beyond max supply", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);

      const maxSupply = await token.MAX_SUPPLY();
      const currentSupply = await token.totalSupply();
      const overMintAmount = maxSupply - currentSupply + ethers.parseEther("1");

      await expect(
        token.mint(owner.address, overMintAmount)
      ).to.be.revertedWith("Mint would exceed max supply");
    });
  });

  describe("Burning", function () {
    it("Should allow users to burn their tokens", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);

      const burnAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(owner.address);

      await token.burn(burnAmount);

      expect(await token.balanceOf(owner.address)).to.equal(
        initialBalance - burnAmount
      );
      expect(await token.totalSupply()).to.equal(ethers.parseEther("999900"));
    });

    it("Should allow burning tokens from another account with approval", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const burnAmount = ethers.parseEther("100");
      await token.transfer(addr1.address, burnAmount);
      await token.connect(addr1).approve(owner.address, burnAmount);

      await token.burnFrom(addr1.address, burnAmount);

      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });
  });

  describe("Pausing", function () {
    it("Should allow pauser to pause transfers", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      await token.pause();

      await expect(
        token.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should allow pauser to unpause transfers", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      await token.pause();
      await token.unpause();

      const amount = ethers.parseEther("100");
      await token.transfer(addr1.address, amount);

      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should not allow non-pauser to pause", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);

      await expect(token.connect(addr1).pause()).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Blacklisting", function () {
    it("Should allow admin to blacklist addresses", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      await token.blacklist(addr1.address);
      expect(await token.blacklisted(addr1.address)).to.be.true;
    });

    it("Should prevent blacklisted addresses from sending tokens", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await token.transfer(addr1.address, ethers.parseEther("100"));
      await token.blacklist(addr1.address);

      await expect(
        token.connect(addr1).transfer(addr2.address, ethers.parseEther("50"))
      ).to.be.revertedWith("Sender is blacklisted");
    });

    it("Should prevent sending tokens to blacklisted addresses", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      await token.blacklist(addr1.address);

      await expect(
        token.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient is blacklisted");
    });

    it("Should allow admin to unblacklist addresses", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      await token.blacklist(addr1.address);
      await token.unblacklist(addr1.address);

      expect(await token.blacklisted(addr1.address)).to.be.false;

      // Should now be able to transfer
      const amount = ethers.parseEther("100");
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });
  });

  describe("Transfer Fees", function () {
    it("Should apply transfer fee when enabled", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      // Set 1% transfer fee (100 basis points)
      await token.setTransferFee(100);

      // Transfer tokens to addr1
      await token.transfer(addr1.address, ethers.parseEther("1000"));

      // addr1 transfers to addr2
      const transferAmount = ethers.parseEther("100");
      await token.connect(addr1).transfer(addr2.address, transferAmount);

      // addr2 should receive 99 tokens (1% fee)
      expect(await token.balanceOf(addr2.address)).to.equal(
        ethers.parseEther("99")
      );

      // Fee should go to fee recipient (owner by default)
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseEther("999001")); // Initial - 1000 + 1 fee
    });

    it("Should not apply fee when set to 0", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      await token.setTransferFee(0);
      await token.transfer(addr1.address, ethers.parseEther("1000"));

      const transferAmount = ethers.parseEther("100");
      await token.connect(addr1).transfer(addr2.address, transferAmount);

      expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
    });

    it("Should not allow fee greater than 10%", async function () {
      const { token } = await loadFixture(deployTokenFixture);

      await expect(
        token.setTransferFee(1001) // 10.01%
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("Should allow changing fee recipient", async function () {
      const { token, owner, addr1, addr2, addr3 } = await loadFixture(
        deployTokenFixture
      );

      await token.setTransferFee(100); // 1% fee
      await token.setFeeRecipient(addr3.address);

      await token.transfer(addr1.address, ethers.parseEther("1000"));
      await token
        .connect(addr1)
        .transfer(addr2.address, ethers.parseEther("100"));

      // Fee should go to addr3
      expect(await token.balanceOf(addr3.address)).to.equal(
        ethers.parseEther("1")
      );
    });
  });

  describe("Permit (EIP-2612)", function () {
    it("Should allow gasless approvals with permit", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const value = ethers.parseEther("100");
      const deadline = ethers.MaxUint256;
      const nonce = await token.nonces(owner.address);

      // Create permit signature
      const domain = {
        name: await token.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        owner: owner.address,
        spender: addr1.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await owner.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Use permit
      await token.permit(
        owner.address,
        addr1.address,
        value,
        deadline,
        v,
        r,
        s
      );

      expect(await token.allowance(owner.address, addr1.address)).to.equal(
        value
      );
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant roles", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.grantRole(MINTER_ROLE, addr1.address);

      expect(await token.hasRole(MINTER_ROLE, addr1.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.grantRole(MINTER_ROLE, addr1.address);
      await token.revokeRole(MINTER_ROLE, addr1.address);

      expect(await token.hasRole(MINTER_ROLE, addr1.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      const { token, addr1, addr2 } = await loadFixture(deployTokenFixture);

      const MINTER_ROLE = await token.MINTER_ROLE();

      await expect(
        token.connect(addr1).grantRole(MINTER_ROLE, addr2.address)
      ).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Token Recovery", function () {
    it("Should allow admin to recover accidentally sent ETH", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      // Send ETH to contract
      await owner.sendTransaction({
        to: await token.getAddress(),
        value: ethers.parseEther("1"),
      });

      const initialBalance = await ethers.provider.getBalance(addr1.address);
      await token.recoverTokens(
        ethers.ZeroAddress,
        addr1.address,
        ethers.parseEther("1")
      );
      const finalBalance = await ethers.provider.getBalance(addr1.address);

      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1"));
    });

    it("Should not allow recovering the token itself", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);

      const tokenAddress = await token.getAddress();

      await expect(
        token.recoverTokens(
          tokenAddress,
          addr1.address,
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Cannot recover own tokens");
    });
  });
});
