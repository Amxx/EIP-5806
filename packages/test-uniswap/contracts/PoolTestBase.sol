// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {CurrencyLibrary, Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {ILockCallback} from "@uniswap/v4-core/src/interfaces/callback/ILockCallback.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

abstract contract PoolTestBase is ILockCallback {
    using CurrencyLibrary for Currency;

    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    function _take(Currency currency, address recipient, int128 amount, bool withdrawTokens) internal {
        require(amount > 0, "PoolTestBase.take Invalid ammount");
        if (withdrawTokens) {
            manager.take(currency, recipient, uint128(amount));
        } else {
            manager.mint(recipient, currency.toId(), uint128(amount));
        }
    }

    function _settle(Currency currency, address payer, int128 amount, bool settleUsingTransfer) internal {
        require(amount < 0, "PoolTestBase.settle Invalid ammount");
        if (settleUsingTransfer) {
            if (currency.isNative()) {
                manager.settle{value: uint128(-amount)}(currency);
            } else {
                IERC20Minimal(Currency.unwrap(currency)).transferFrom(payer, address(manager), uint128(-amount));
                manager.settle(currency);
            }
        } else {
            manager.burn(payer, currency.toId(), uint128(-amount));
        }
    }

    function _fetchBalances(Currency currency, address user, address deltaHolder)
        internal
        view
        returns (uint256 userBalance, uint256 poolBalance, uint256 reserves, int256 delta)
    {
        userBalance = currency.balanceOf(user);
        poolBalance = currency.balanceOf(address(manager));
        reserves = manager.reservesOf(currency);
        delta = manager.currencyDelta(deltaHolder, currency);
    }
}
