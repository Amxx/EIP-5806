// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20, ERC20TransientAllowance} from "./libs/ERC20TransientAllowance.sol";

contract ERC20Mock is ERC20TransientAllowance {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }
}