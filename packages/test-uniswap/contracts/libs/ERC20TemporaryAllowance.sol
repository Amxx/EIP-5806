// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Slots} from "./Slots.sol";
import {TransientStorage} from "./TransientStorage.sol";

abstract contract ERC20TemporaryAllowance is ERC20 {
    using Slots for bytes32;
    using TransientStorage for bytes32;

    /// We reuse the same storage slot (defined using ERC7201) as the one used for normal storage
    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ERC20")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant ERC20StorageLocation = 0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace00;

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        (bool success, uint256 amount) = Math.tryAdd(super.allowance(owner, spender), _loadTranscientAllowance(owner, spender));
        return success ? amount : type(uint256).max;
    }

    function temporaryApproval(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _storeTranscientAllowance(owner, spender, value);
        return true;
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual override {
        unchecked {
            // load transient allowance
            uint256 currentTransientAllowance = _loadTranscientAllowance(owner, spender);
            // if infinite, do nothing
            if (currentTransientAllowance == type(uint256).max) return;
            // check how much of the value is covered by the transient allowance
            uint256 spendTransientAllowance = Math.min(currentTransientAllowance, value);
            // decrease transient allowance accordingly
            _storeTranscientAllowance(owner, spender, currentTransientAllowance - spendTransientAllowance);
            // if everything is covered, stop
            if (value == spendTransientAllowance) return;
            // otherwize, spend the rest from "normal" allowance
            super._spendAllowance(owner, spender, value - spendTransientAllowance);
        }
    }

    function _loadTranscientAllowance(address owner, address spender) private view returns (uint256) {
        return ERC20StorageLocation.offset(1).derivateMapping(owner).derivateMapping(spender).loadUint256();
    }

    function _storeTranscientAllowance(address owner, address spender, uint256 value) private {
        ERC20StorageLocation.offset(1).derivateMapping(owner).derivateMapping(spender).store(value);
    }
}
