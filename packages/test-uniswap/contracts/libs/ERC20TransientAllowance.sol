// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {TransientStorage} from "./TransientStorage.sol";

abstract contract ERC20TransientAllowance is ERC20 {
    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ERC20TransientAllowance")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant ERC20TransientAllowanceLocation = 0x4a282c780a8065895b22ad97ecbf85ab9f6c03bfff9a7f6b61013cf12277df00;

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        (bool success, uint256 amount) = Math.tryAdd(super.allowance(owner, spender), _loadTranscientAllowance(owner, spender));
        return success ? amount : type(uint256).max;
    }

    function approveTransient(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _storeTranscientAllowance(owner, spender, value);
        return true;
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual override {
        unchecked {
            uint256 currentTransientAllowance = _loadTranscientAllowance(owner, spender);
            if (currentTransientAllowance != type(uint256).max) {
                uint256 spend = Math.min(currentTransientAllowance, value);
                _storeTranscientAllowance(owner, spender, currentTransientAllowance - spend);
                if (spend < value) {
                    super._spendAllowance(owner, spender, value);
                }
            }
        }
    }

    function _loadTranscientAllowance(address owner, address spender) private view returns (uint256) {
        return TransientStorage.loadUint256(_transientAllowanceSlot(owner, spender));
    }

    function _storeTranscientAllowance(address owner, address spender, uint256 value) private {
        return TransientStorage.store(_transientAllowanceSlot(owner, spender), value);
    }

    function _transientAllowanceSlot(address owner, address spender) private pure returns (bytes32 slot) {
        return _efficientHash(_efficientHash(ERC20TransientAllowanceLocation, bytes32(bytes20(owner))), bytes32(bytes20(spender)));
    }

    function _efficientHash(bytes32 a, bytes32 b) private pure returns (bytes32 value) {
        /// @solidity memory-safe-assembly
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}
