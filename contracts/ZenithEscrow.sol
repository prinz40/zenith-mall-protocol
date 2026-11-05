// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract ZenithMallEscrow {
    address public imperialVaultAdmin;
    IERC20 public stablecoin;
    // FIXED v2 - HONEST 90/10 - Matches Zenith Mall claim!
    uint256 public constant PLATFORM_FEE_PERCENT = 10;
    uint256 public constant VENDOR_SHARE_PERCENT = 90;
    // 7 days to dispute / confirm after lock - No funds locked forever
    uint256 public constant DISPUTE_WINDOW = 7 days;

    enum OrderState { AWAITING_DELIVERY, DISPUTED, COMPLETED, REFUNDED, CANCELLED }

    struct Order {
        uint256 orderId;
        address buyer;
        address vendor;
        uint256 amount;
        OrderState state;
        bool isValueDeposited;
        uint256 createdAt;
        uint256 disputeDeadline;
    }

    mapping(uint256 => Order) public orders;

    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed vendor, uint256 amount);
    event OrderConfirmedAndReleased(uint256 indexed orderId, address vendor, uint256 vendorShare, uint256 platformFee);
    event OrderDisputed(uint256 indexed orderId, address indexed buyer);
    event OrderRefunded(uint256 indexed orderId, address buyer);
    event OrderCancelled(uint256 indexed orderId, address buyer);

    modifier onlyAdmin() {
        require(msg.sender == imperialVaultAdmin, "Zenith Escrow: Only Vault Admin allowed.");
        _;
    }

    constructor(address _stablecoinAddress) {
        require(_stablecoinAddress != address(0), "Invalid stablecoin address.");
        imperialVaultAdmin = msg.sender;
        stablecoin = IERC20(_stablecoinAddress);
    }

    // Buyer MUST call stablecoin.approve(escrowAddress, amount) FIRST, then this!
    function lockPayment(uint256 _orderId, address _vendor, uint256 _amount) external {
        require(orders[_orderId].amount == 0, "Order already exists.");
        require(_amount > 0, "Amount must be > 0.");
        require(_vendor != address(0), "Invalid vendor.");
        require(_vendor != msg.sender, "Buyer cannot be vendor.");
        require(stablecoin.transferFrom(msg.sender, address(this), _amount), "Transfer failed. Did you approve?");

        orders[_orderId] = Order({
            orderId: _orderId,
            buyer: msg.sender,
            vendor: _vendor,
            amount: _amount,
            state: OrderState.AWAITING_DELIVERY,
            isValueDeposited: true,
            createdAt: block.timestamp,
            disputeDeadline: block.timestamp + DISPUTE_WINDOW
        });

        emit OrderCreated(_orderId, msg.sender, _vendor, _amount);
    }

    function confirmDelivery(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer can confirm.");
        require(order.state == OrderState.AWAITING_DELIVERY, "Invalid state. Already disputed/completed?");
        require(order.isValueDeposited, "No funds.");

        order.state = OrderState.COMPLETED;
        order.isValueDeposited = false;

        uint256 platformFee = (order.amount * PLATFORM_FEE_PERCENT) / 100;
        uint256 vendorShare = order.amount - platformFee;

        require(stablecoin.transfer(order.vendor, vendorShare), "Vendor payout failed.");
        require(stablecoin.transfer(imperialVaultAdmin, platformFee), "Platform fee failed.");

        emit OrderConfirmedAndReleased(_orderId, order.vendor, vendorShare, platformFee);
    }

    // NEW v2 - Buyer can raise dispute - This was missing!
    function raiseDispute(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer can dispute.");
        require(order.state == OrderState.AWAITING_DELIVERY, "Cannot dispute now.");
        require(order.isValueDeposited, "No funds.");
        require(block.timestamp <= order.disputeDeadline, "Dispute window expired. Contact Admin.");

        order.state = OrderState.DISPUTED;
        emit OrderDisputed(_orderId, msg.sender);
    }

    // NEW v2 - Buyer can cancel if vendor never ships and no dispute yet
    function cancelOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer can cancel.");
        require(order.state == OrderState.AWAITING_DELIVERY, "Cannot cancel now.");
        require(order.isValueDeposited, "No funds.");
        require(block.timestamp > order.disputeDeadline, "Wait for dispute window. Use raiseDispute if issue.");

        order.state = OrderState.CANCELLED;
        order.isValueDeposited = false;
        require(stablecoin.transfer(order.buyer, order.amount), "Refund failed.");
        emit OrderCancelled(_orderId, msg.sender);
    }

    // FIXED v2 - Now accepts DISPUTED + AWAITING_DELIVERY
    function resolveDispute(uint256 _orderId, bool _refundBuyer) external onlyAdmin {
        Order storage order = orders[_orderId];
        require(order.state == OrderState.AWAITING_DELIVERY || order.state == OrderState.DISPUTED, "Cannot resolve. Already completed/refunded.");
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

    // Helper - View order + fee breakdown before confirm
    function getOrderDetails(uint256 _orderId) external view returns (Order memory order, uint256 vendorShare, uint256 platformFee) {
        order = orders[_orderId];
        platformFee = (order.amount * PLATFORM_FEE_PERCENT) / 100;
        vendorShare = order.amount - platformFee;
    }

    // Admin transfer if you ever change wallet - Safety
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid new admin.");
        imperialVaultAdmin = _newAdmin;
    }
}
