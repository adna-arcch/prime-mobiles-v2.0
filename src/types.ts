export type UserRole = 'Admin' | 'Staff';

export interface AppUser {
  id: string;
  fullName: string;
  username: string;
  password: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: string;
}

export type ApprovalStatus = 'Approved' | 'Pending Approval' | 'Rejected';

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  previousStockQuantity?: number;
  approvalStatus: ApprovalStatus;
  createdBy: string;
  createdByRole: UserRole;
  createdAt: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export type WorkType = 'Shop Work' | 'Work From Home';

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffUsername: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  time: string;
  workType: WorkType;
  createdAt: string;
}

export interface StoreSettings {
  id: string;
  businessName: string;
  phoneNumber: string;
  lowStockLimit: number;
  discountPercent: number;
  discountTitle: string;
  discountActive: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export type NotificationSeverity = 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface StockNotification {
  id: string;
  productId: string;
  productName: string;
  stockQuantity: number;
  message: string;
  severity: NotificationSeverity;
  createdAt: string;
  dismissed: boolean;
}

export type OrderStatus = 'Pending' | 'Delivered';

export interface DeliveryOrder {
  id: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  totalAmount: number;
  status: OrderStatus;
  markedBy: string;
  markedByUsername: string;
  createdAt: string;
  deliveredAt?: string;
}

export type NavTab = 'dashboard' | 'attendance' | 'products' | 'profile' | 'settings';
