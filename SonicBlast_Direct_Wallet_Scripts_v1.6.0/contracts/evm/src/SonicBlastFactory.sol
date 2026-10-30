// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SonicBlastToken.sol";

/// @title SonicBlastFactory
/// @notice Deploys the transparent, fixed-supply SonicBlastToken contract from a connected wallet.
/// @dev The factory has no owner, fee, custody, tax, blacklist, or upgrade controls.
contract SonicBlastFactory {
    event TokenCreated(
        address indexed token,
        address indexed initialOwner,
        string name,
        string symbol,
        uint256 initialSupply,
        uint8 decimals
    );

    error InvalidSupply();

    /// @notice Deploy a new fixed-supply token and send its complete initial supply to `initialOwner`.
    /// @param name_ Display name for the new token.
    /// @param symbol_ Ticker for the new token.
    /// @param decimals_ Number of token decimals (0 through 18 is enforced by the browser and token contract).
    /// @param initialSupply_ Whole-token supply before decimal scaling.
    /// @param initialOwner_ Public address that receives the complete initial supply.
    function createToken(
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialOwner_
    ) external returns (address token) {
        if (initialSupply_ == 0) revert InvalidSupply();
        SonicBlastToken deployed = new SonicBlastToken(name_, symbol_, decimals_, initialSupply_, initialOwner_);
        token = address(deployed);
        emit TokenCreated(token, initialOwner_, name_, symbol_, initialSupply_, decimals_);
    }
}
