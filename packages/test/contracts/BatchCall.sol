// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BatchCall {
    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    function exec(Call[] calldata calls) external {
        for (uint256 i = 0; i < calls.length; ++i) {
            (bool success, bytes memory returndata) = calls[i].target.call{value: calls[i].value}(calls[i].data);
            if (!success) {
                assembly ("memory-safe") {
                    revert(add(32, returndata), mload(returndata))
                }
            }
        }
    }
}
