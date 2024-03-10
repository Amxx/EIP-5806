// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";

contract Mock {
    uint256 public counter;

    event Context(address emitter, address caller, uint256 value, uint256 balance);
    event NewClone(address instance);

    function log() public payable {
        emit Context(address(this), msg.sender, msg.value, address(this).balance);
    }

    function increment() public {
        ++counter;
    }

    receive() external payable {}

    function call(address target, uint256 value, bytes calldata data) public payable returns (bytes memory) {
        (bool success, bytes memory returndata) = target.call{ value: value }(data);
        require(success, "low level call reverted");
        return returndata;
    }

    function delegatecall(address target, bytes calldata data) public returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
        require(success, "low level delegatecall reverted");
        return returndata;
    }

    function destroy() public {
        selfdestruct(payable(msg.sender));
    }

    function create() public {
        address instance = Clones.clone(address(this));
        emit NewClone(instance);
    }

    function create2(bytes32 salt) public {
        address instance = Clones.cloneDeterministic(address(this), salt);
        emit NewClone(instance);
    }
}
