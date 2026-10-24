// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract ZenithMallEscrow {
    address public imperialVaultAdmin; 
    IERC20 public stablecoin;         
    uint256 public constant PLATFORM_FEE_PERCENT = 2; 

    enum OrderState { AWAITING_DELIVERY, DISPUTED, COMPLETED, REFUNDED }

    struct Order {
        uint256 orderId;
        address buyer;
        address vendor;
        uint256 amount;
        OrderState state;
        bool isValueDeposited;
    }

    mapping(uint256 => Order) public orders;

    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed vendor, uint256 amount);
    event OrderConfirmedAndReleased(uint256 indexed orderId, address vendor, uint256 vendorShare, uint256 platformFee);
    event OrderDisputed(uint256 indexed orderId);
    event OrderRefunded(uint256 indexed orderId, address buyer);

    modifier onlyAdmin() {
        require(msg.sender == imperialVaultAdmin, "Zenith Escrow: Only Vault Admin allowed.");
        _;
    }

    constructor(address _stablecoinAddress) {
        imperialVaultAdmin = msg.sender;
        stablecoin = IERC20(_stablecoinAddress);
    }

    function lockPayment(uint256 _orderId, address _vendor, uint256 _amount) external {
        require(orders[_orderId].amount == 0, "Order already exists.");
        require(_amount > 0, "Amount must be > 0.");
        require(stablecoin.transferFrom(msg.sender, address(this), _amount), "Transfer failed.");

        orders[_orderId] = Order({
            orderId: _orderId,
            buyer: msg.sender,
            vendor: _vendor,
            amount: _amount,
            state: OrderState.AWAITING_DELIVERY,
            isValueDeposited: true
        });

        emit OrderCreated(_orderId, msg.sender, _vendor, _amount);
    }

    function confirmDelivery(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer can confirm.");
        require(order.state == OrderState.AWAITING_DELIVERY, "Invalid state.");
        require(order.isValueDeposited, "No funds.");

        order.state = OrderState.COMPLETED;
        order.isValueDeposited = false;

        uint256 platformFee = (order.amount * PLATFORM_FEE_PERCENT) / 100;
        uint256 vendorShare = order.amount - platformFee;

        require(stablecoin.transfer(order.vendor, vendorShare), "Vendor payout failed.");
        require(stablecoin.transfer(imperialVaultAdmin, platformFee), "Platform fee failed.");

        emit OrderConfirmedAndReleased(_orderId, order.vendor, vendorShare, platformFee);
    }

    function resolveDispute(uint256 _orderId, bool _refundBuyer) external onlyAdmin {
        Order storage order = orders[_orderId];
        require(order.state == OrderState.AWAITING_DELIVERY, "Cannot resolve.");
        require(order.isValueDeposited, "No funds.");

        order.isValueDeposited = false;

        if (_refundBuyer) {
            order.state = OrderState.REFUNDED;
            require(stablecoin.transfer(order.buyer, order.amount), "Refund failed.");
            emit OrderRefunded(_orderId, order.buyer);
        } else {
            order.state = OrderState.COMPLETED;
            uint256 platformFee = (order.amount * PLATFORM_FEE_PERCENT) / 100;
            uint256 vendorShare = order.amount - platformFee;
            require(stablecoin.transfer(order.vendor, vendorShare), "Vendor payout failed.");
            require(stablecoin.transfer(imperialVaultAdmin, platformFee), "Platform fee failed.");
            emit OrderConfirmedAndReleased(_orderId, order.vendor, vendorShare, platformFee);
        }
    }
}

