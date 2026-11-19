import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AppUser,
  AttendanceRecord,
  DeliveryOrder,
  Product,
  StockNotification,
  StoreSettings,
  UserRole,
  WorkType,
} from '../types';
import {
  formatTimeNow,
  generateSafeId,
  getCurrentMonthString,
  getTodayDateString,
  normalizePhone,
  normalizeUsername,
} from '../utils/formatters';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 'storeConfig',
  businessName: 'Prime Mobiles',
  phoneNumber: '+94 77 123 4567',
  lowStockLimit: 5,
  discountPercent: 0,
  discountTitle: '',
  discountActive: false,
  updatedAt: new Date().toISOString(),
};

export async function ensureStoreSettings(): Promise<void> {
  const ref = doc(db, 'settings', 'storeConfig');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        businessName: DEFAULT_STORE_SETTINGS.businessName,
        phoneNumber: DEFAULT_STORE_SETTINGS.phoneNumber,
        lowStockLimit: DEFAULT_STORE_SETTINGS.lowStockLimit,
        discountPercent: DEFAULT_STORE_SETTINGS.discountPercent,
        discountTitle: DEFAULT_STORE_SETTINGS.discountTitle,
        discountActive: DEFAULT_STORE_SETTINGS.discountActive,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/storeConfig');
  }
}

export async function registerUserAccount(params: {
  fullName: string;
  username: string;
  phoneNumber: string;
  password: string;
  forceRole?: UserRole;
}): Promise<AppUser> {
  const fullName = params.fullName.trim();
  const username = normalizeUsername(params.username);
  const phoneNumber = normalizePhone(params.phoneNumber);
  const password = params.password;

  if (!fullName || !username || !phoneNumber || !password) {
    throw new Error('All fields required');
  }

  if (!/^[a-z0-9_.-]+$/.test(username)) {
    throw new Error('Username may only use letters, numbers, dots, underscores, or hyphens');
  }

  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }

  let existingUsersSnap;
  try {
    existingUsersSnap = await getDocs(query(collection(db, 'users'), limit(1000)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }

  const existingUsers = existingUsersSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as AppUser)
  );

  if (existingUsers.some((u) => u.username.toLowerCase() === username)) {
    throw new Error('Username already taken, try another');
  }

  const compactIncomingPhone = phoneNumber.replace(/\s+/g, '');
  if (
    existingUsers.some(
      (u) => u.phoneNumber.replace(/\s+/g, '') === compactIncomingPhone
    )
  ) {
    throw new Error('Phone already registered');
  }

  const assignedRole: UserRole =
    params.forceRole ?? (existingUsers.length === 0 ? 'Admin' : 'Staff');

  const userId = generateSafeId('usr');
  const createdAt = new Date().toISOString();
  const userPayload = {
    fullName,
    username,
    password,
    phoneNumber,
    role: assignedRole,
    createdAt,
  };

  try {
    await setDoc(doc(db, 'users', userId), userPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
  }

  await ensureStoreSettings();

  return {
    id: userId,
    ...userPayload,
  };
}

export async function loginUserAccount(params: {
  username: string;
  password: string;
}): Promise<AppUser> {
  const username = normalizeUsername(params.username);
  const password = params.password;

  if (!username || !password) {
    throw new Error('All fields required');
  }

  let snap;
  try {
    snap = await getDocs(
      query(collection(db, 'users'), where('username', '==', username), limit(5))
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }

  if (snap.empty) {
    throw new Error('Username not found. Please Register first');
  }

  const userDoc = snap.docs[0];
  const userData = userDoc.data() as Omit<AppUser, 'id'>;

  if (userData.password !== password) {
    throw new Error('Wrong Password. Try again');
  }

  return {
    id: userDoc.id,
    ...userData,
  };
}

export async function updateUserRoleOrInfo(
  userId: string,
  updates: Partial<Pick<AppUser, 'role' | 'fullName' | 'phoneNumber'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function removeUserAccount(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

export async function markDailyAttendance(
  user: AppUser,
  workType: WorkType
): Promise<AttendanceRecord> {
  const now = new Date();
  const date = getTodayDateString(now);
  const month = getCurrentMonthString(now);
  const time = formatTimeNow(now);
  const attendanceId = `${user.id}_${date}`;

  const ref = doc(db, 'attendance', attendanceId);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      throw new Error('Already Marked Today');
    }

    const payload = {
      staffId: user.id,
      staffName: user.fullName,
      staffUsername: user.username,
      date,
      month,
      time,
      workType,
      createdAt: now.toISOString(),
    };

    await setDoc(ref, payload);
    return {
      id: attendanceId,
      ...payload,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Already Marked Today') {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, `attendance/${attendanceId}`);
  }
}

export async function syncProductStockNotification(
  product: Product,
  lowStockLimit: number
): Promise<void> {
  const notifId = `notif_${product.id}`;
  const notifRef = doc(db, 'notifications', notifId);

  if (product.approvalStatus !== 'Approved') {
    return;
  }

  if (product.stockQuantity >= lowStockLimit) {
    try {
      const existing = await getDoc(notifRef);
      if (existing.exists()) {
        await deleteDoc(notifRef);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
    }
    return;
  }

  const isOut = product.stockQuantity === 0;
  const severity = isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK';
  const rawMessage = isOut
    ? `${product.name} - Out of Stock (0 left)! Restock karanna`
    : `${product.name} - Stock ${product.stockQuantity} left! Restock karanna`;
  const message = rawMessage.slice(0, 300);

  const payload: Omit<StockNotification, 'id'> = {
    productId: product.id,
    productName: product.name,
    stockQuantity: product.stockQuantity,
    message,
    severity,
    createdAt: new Date().toISOString(),
    dismissed: false,
  };

  try {
    await setDoc(notifRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notifId}`);
  }
}

export async function createProductRecord(
  params: {
    name: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
  },
  user: AppUser,
  lowStockLimit: number
): Promise<Product> {
  const productId = generateSafeId('prd');
  const now = new Date().toISOString();
  const approvalStatus = user.role === 'Admin' ? 'Approved' : 'Pending Approval';

  const payload: Omit<Product, 'id'> = {
    name: params.name.trim().slice(0, 150),
    category: params.category.trim().slice(0, 80),
    costPrice: Number(params.costPrice),
    sellingPrice: Number(params.sellingPrice),
    stockQuantity: Number(params.stockQuantity),
    approvalStatus,
    createdBy: user.fullName.slice(0, 120),
    createdByRole: user.role,
    createdAt: now,
    lastUpdatedBy: user.fullName.slice(0, 120),
    lastUpdatedAt: now,
  };

  try {
    await setDoc(doc(db, 'products', productId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `products/${productId}`);
  }

  const created: Product = { id: productId, ...payload };
  if (created.approvalStatus === 'Approved') {
    await syncProductStockNotification(created, lowStockLimit);
  }
  return created;
}

export async function updateProductRecord(
  product: Product,
  updates: Partial<Omit<Product, 'id' | 'createdAt' | 'createdBy' | 'createdByRole'>>,
  actor: AppUser,
  lowStockLimit: number
): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    ...updates,
    lastUpdatedBy: `${actor.role === 'Admin' ? 'Admin' : actor.fullName} (${actor.fullName})`.slice(0, 120),
    lastUpdatedAt: now,
  };

  try {
    await updateDoc(doc(db, 'products', product.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
  }

  const merged: Product = { ...product, ...payload };
  await syncProductStockNotification(merged, lowStockLimit);
}

export async function deleteProductRecord(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', productId));
    const notifRef = doc(db, 'notifications', `notif_${productId}`);
    const notifSnap = await getDoc(notifRef);
    if (notifSnap.exists()) {
      await deleteDoc(notifRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

export async function deleteAllProductsAndNotifications(): Promise<void> {
  try {
    const [prodSnap, notifSnap] = await Promise.all([
      getDocs(query(collection(db, 'products'), limit(1000))),
      getDocs(query(collection(db, 'notifications'), limit(1000))),
    ]);

    const batch = writeBatch(db);
    prodSnap.docs.forEach((d) => batch.delete(d.ref));
    notifSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'products');
  }
}

export async function dismissNotification(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { dismissed: true });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `notifications/${notificationId}`
    );
  }
}

export async function updateStoreSettingsRecord(
  settings: Omit<StoreSettings, 'id'>,
  allProducts: Product[]
): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'storeConfig'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/storeConfig');
  }

  // Re-evaluate notifications against the updated lowStockLimit
  await Promise.all(
    allProducts.map((product) =>
      syncProductStockNotification(product, settings.lowStockLimit)
    )
  );
}

export async function createDeliveryOrder(params: {
  customerName: string;
  product: Product;
  quantity: number;
  unitSellingPrice: number;
  status: 'Pending' | 'Delivered';
  user: AppUser;
}): Promise<DeliveryOrder> {
  const orderId = generateSafeId('ord');
  const now = new Date().toISOString();
  const totalAmount = Math.round(params.unitSellingPrice * params.quantity * 100) / 100;

  const payload: Omit<DeliveryOrder, 'id'> = {
    customerName: params.customerName.trim(),
    productId: params.product.id,
    productName: params.product.name,
    quantity: params.quantity,
    unitSellingPrice: params.unitSellingPrice,
    totalAmount,
    status: params.status,
    markedBy: params.user.fullName,
    markedByUsername: params.user.username,
    createdAt: now,
    ...(params.status === 'Delivered' ? { deliveredAt: now } : {}),
  };

  try {
    await setDoc(doc(db, 'orders', orderId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
  }

  return { id: orderId, ...payload };
}

export async function markOrderDelivered(orderId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'Delivered',
      deliveredAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }
}
