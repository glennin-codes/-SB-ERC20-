// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SimBankToken
 * @dev Upgradeable ERC20 token with minting, burning, pausing, and access control features.
 *
 * Features:
 * - Upgradeable via UUPS proxy pattern
 * - Mintable with MINTER_ROLE
 * - Burnable by token holders
 * - Pausable by PAUSER_ROLE
 * - EIP-2612 Permit for gasless transactions
 * - Role-based access control
 *
 * Supported Networks:
 * - Polygon (Mainnet & Amoy Testnet)
 * - Berachain (Mainnet & bArtio Testnet)
 */
contract SimBankToken is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PermitUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Token details
    uint256 public constant MAX_SUPPLY = 1000000000 * 10 ** 18; // 1 billion tokens max supply

    // Additional state variables
    mapping(address => bool) public blacklisted;
    uint256 public transferFeePercentage; // Fee in basis points (1 = 0.01%)
    address public feeRecipient;

    // Events
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);
    event TransferFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address indexed newRecipient);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with initial parameters
     * @param _initialSupply Initial token supply to mint
     * @param _admin Address to grant all roles to
     */
    function initialize(
        uint256 _initialSupply,
        address _admin
    ) public initializer {
        require(_admin != address(0), "Admin cannot be zero address");
        require(
            _initialSupply <= MAX_SUPPLY,
            "Initial supply exceeds max supply"
        );

        __ERC20_init("SimBank", "SB");
        __ERC20Burnable_init();
        __ERC20Permit_init("SimBank");
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        // Mint initial supply to admin
        if (_initialSupply > 0) {
            _mint(_admin, _initialSupply);
        }

        // Initialize fee settings
        transferFeePercentage = 0; // No fee by default
        feeRecipient = _admin;
    }

    /**
     * @dev Mints new tokens to specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "Mint would exceed max supply"
        );
        _mint(to, amount);
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Adds an address to the blacklist
     * @param account Address to blacklist
     */
    function blacklist(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Cannot blacklist zero address");
        require(!blacklisted[account], "Account already blacklisted");
        blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @dev Removes an address from the blacklist
     * @param account Address to unblacklist
     */
    function unblacklist(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(blacklisted[account], "Account not blacklisted");
        blacklisted[account] = false;
        emit Unblacklisted(account);
    }

    /**
     * @dev Sets the transfer fee percentage
     * @param _feePercentage Fee in basis points (max 1000 = 10%)
     */
    function setTransferFee(
        uint256 _feePercentage
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feePercentage <= 1000, "Fee cannot exceed 10%");
        transferFeePercentage = _feePercentage;
        emit TransferFeeUpdated(_feePercentage);
    }

    /**
     * @dev Sets the fee recipient address
     * @param _feeRecipient Address to receive fees
     */
    function setFeeRecipient(
        address _feeRecipient
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _feeRecipient != address(0),
            "Fee recipient cannot be zero address"
        );
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * @param from Address tokens are transferred from
     * @param to Address tokens are transferred to
     * @param value Amount of tokens being transferred
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        require(!blacklisted[from], "Sender is blacklisted");
        require(!blacklisted[to], "Recipient is blacklisted");

        super._update(from, to, value);
    }

    /**
     * @dev Public transfer function with fee mechanism
     * @param to Address tokens are transferred to
     * @param amount Amount of tokens being transferred
     */
    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        address from = _msgSender();

        uint256 feeAmount = 0;

        // Calculate fee if applicable
        if (
            transferFeePercentage > 0 && from != address(0) && to != address(0)
        ) {
            feeAmount = (amount * transferFeePercentage) / 10000;
            if (feeAmount > 0 && feeRecipient != address(0)) {
                _transfer(from, feeRecipient, feeAmount);
            }
        }

        // Transfer the remaining amount
        uint256 transferAmount = amount - feeAmount;
        _transfer(from, to, transferAmount);

        return true;
    }

    /**
     * @dev Public transferFrom function with fee mechanism
     * @param from Address tokens are transferred from
     * @param to Address tokens are transferred to
     * @param amount Amount of tokens being transferred
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);

        uint256 feeAmount = 0;

        // Calculate fee if applicable
        if (
            transferFeePercentage > 0 && from != address(0) && to != address(0)
        ) {
            feeAmount = (amount * transferFeePercentage) / 10000;
            if (feeAmount > 0 && feeRecipient != address(0)) {
                _transfer(from, feeRecipient, feeAmount);
            }
        }

        // Transfer the remaining amount
        uint256 transferAmount = amount - feeAmount;
        _transfer(from, to, transferAmount);

        return true;
    }

    /**
     * @dev Authorizes contract upgrades
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Returns the current version of the contract
     */
    function version() public pure virtual returns (string memory) {
        return "1.0.0";
    }

    /**
     * @dev Emergency function to recover accidentally sent tokens
     * @param token Address of token to recover (address(0) for ETH)
     * @param to Address to send recovered tokens to
     * @param amount Amount to recover
     */
    function recoverTokens(
        address token,
        address to,
        uint256 amount
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Cannot recover to zero address");

        if (token == address(0)) {
            // Recover ETH
            payable(to).transfer(amount);
        } else {
            // Recover ERC20 tokens
            require(token != address(this), "Cannot recover own tokens");
            ERC20Upgradeable(token).transfer(to, amount);
        }
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
