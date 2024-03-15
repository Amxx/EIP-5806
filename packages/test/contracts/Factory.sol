// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

contract Factory {
    function deploy(bytes32 salt, bytes calldata bytecode) external payable returns (address) {
        return Create2.deploy(msg.value, salt, bytecode);
    }

    function computeAddress(bytes32 salt, bytes calldata bytecode) external view returns (address) {
        return Create2.computeAddress(salt, keccak256(bytecode));
    }
}
