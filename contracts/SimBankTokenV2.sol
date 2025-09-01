// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./SimBankToken.sol";

/**
 * @title SimBankTokenV2
 * @dev Example of an upgraded version of SimBankToken
 * This demonstrates how to add new features while maintaining state
 */
contract SimBankTokenV2 is SimBankToken {
    // New state variables for V2
    mapping(address => uint256) public stakingBalance;
    mapping(address => uint256) public stakingTimestamp;
    uint256 public stakingRewardRate; // Reward rate in basis points per day

    // New events for V2
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event StakingRewardRateUpdated(uint256 newRate);

    /**
     * @dev Initializes V2 specific features
     * This is called after upgrade
     */
    function initializeV2(uint256 _stakingRewardRate) public reinitializer(2) {
        stakingRewardRate = _stakingRewardRate;
    }

    /**
     * @dev Returns the current version of the contract
     */
    function version() public pure override returns (string memory) {
        return "2.0.0";
    }

    /**
     * @dev Stake tokens to earn rewards
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) public whenNotPaused {
        require(amount > 0, "Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Calculate and add pending rewards if already staking
        if (stakingBalance[msg.sender] > 0) {
            uint256 reward = calculateReward(msg.sender);
            if (reward > 0) {
                _mint(msg.sender, reward);
            }
        }

        // Transfer tokens from user to contract
        _transfer(msg.sender, address(this), amount);

        // Update staking balance and timestamp
        stakingBalance[msg.sender] += amount;
        stakingTimestamp[msg.sender] = block.timestamp;

        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Unstake tokens and claim rewards
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) public whenNotPaused {
        require(amount > 0, "Cannot unstake 0 tokens");
        require(
            stakingBalance[msg.sender] >= amount,
            "Insufficient staked balance"
        );

        // Calculate rewards
        uint256 reward = calculateReward(msg.sender);

        // Update staking balance
        stakingBalance[msg.sender] -= amount;

        // Transfer staked tokens back to user
        _transfer(address(this), msg.sender, amount);

        // Mint rewards if any
        if (reward > 0) {
            require(
                totalSupply() + reward <= MAX_SUPPLY,
                "Reward would exceed max supply"
            );
            _mint(msg.sender, reward);
        }

        // Update timestamp
        stakingTimestamp[msg.sender] = block.timestamp;

        emit Unstaked(msg.sender, amount, reward);
    }

    /**
     * @dev Calculate pending rewards for a user
     * @param user Address of the user
     * @return Pending reward amount
     */
    function calculateReward(address user) public view returns (uint256) {
        if (stakingBalance[user] == 0) {
            return 0;
        }

        uint256 stakingDuration = block.timestamp - stakingTimestamp[user];
        uint256 daysStaked = stakingDuration / 1 days;

        if (daysStaked == 0) {
            return 0;
        }

        // Calculate reward: (staked amount * reward rate * days) / 10000
        uint256 reward = (stakingBalance[user] *
            stakingRewardRate *
            daysStaked) / 10000;

        return reward;
    }

    /**
     * @dev View pending rewards for a user
     * @param user Address of the user
     * @return Pending reward amount
     */
    function pendingRewards(address user) public view returns (uint256) {
        return calculateReward(user);
    }

    /**
     * @dev Update staking reward rate
     * @param _newRate New reward rate in basis points per day
     */
    function setStakingRewardRate(
        uint256 _newRate
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newRate <= 100, "Reward rate too high"); // Max 1% per day
        stakingRewardRate = _newRate;
        emit StakingRewardRateUpdated(_newRate);
    }

    /**
     * @dev Get total staked supply
     * @return Total amount of tokens staked
     */
    function totalStaked() public view returns (uint256) {
        return balanceOf(address(this));
    }
}
