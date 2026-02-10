import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  UserRole,
  LoginProvider,
  AccountType,
  AccountStatus,
  TransactionType,
  TransactionStatus,
  TransactionCategory,
} from './generated/prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: 'postgresql://danish:root@localhost:5432/hackathon?schema=public',
  }),
});

const USER_IDS = {
  admin: '66ef5730-c5a9-48f8-b65c-d5c3012acc47',
  user1: '378fb91a-7706-4cfc-aa27-ba66c8e9d123',
  user2: '478fb91a-7706-4cfc-aa27-ba66c8e9d456',
};

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Reset database
  console.log('🗑️  Resetting database...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Transaction" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Account" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "UserProfile" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VerificationToken" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "OtpVerification" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RateLimit" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');

  // Create users
  console.log('👤 Creating users...');
  const adminPassword = await hashPassword('Admin123!');
  const user1Password = await hashPassword('User123!');
  const user2Password = await hashPassword('User123!');

  const admin = await prisma.user.create({
    data: {
      id: USER_IDS.admin,
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword.hash,
      salt: adminPassword.salt,
      role: UserRole.ADMIN,
      loginProvider: LoginProvider.EMAIL,
      isEmailVerified: true,
      userProfile: {
        create: {
          age: 30,
          city: 'New York',
          country: 'USA',
        },
      },
    },
  });

  const user1 = await prisma.user.create({
    data: {
      id: USER_IDS.user1,
      name: 'John Doe',
      email: 'john@example.com',
      password: user1Password.hash,
      salt: user1Password.salt,
      role: UserRole.USER,
      loginProvider: LoginProvider.EMAIL,
      isEmailVerified: true,
      userProfile: {
        create: {
          age: 28,
          city: 'Los Angeles',
          country: 'USA',
        },
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: USER_IDS.user2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: user2Password.hash,
      salt: user2Password.salt,
      role: UserRole.USER,
      loginProvider: LoginProvider.EMAIL,
      isEmailVerified: true,
      userProfile: {
        create: {
          age: 32,
          city: 'Chicago',
          country: 'USA',
        },
      },
    },
  });

  console.log('✅ Created 3 users');

  // Create accounts for user1
  console.log('🏦 Creating accounts...');
  const user1CurrentAccount = await prisma.account.create({
    data: {
      userId: user1.id,
      accountNumber: '1234567890',
      iban: 'PK36DESI1234567890',
      routingNumber: '123456789',
      accountType: AccountType.CURRENT,
      accountStatus: AccountStatus.ACTIVE,
      balance: 5000.0,
      currency: 'PKR',
      nickname: 'Main Checking',
    },
  });

  const user1SavingsAccount = await prisma.account.create({
    data: {
      userId: user1.id,
      accountNumber: '2234567891',
      iban: 'PK36DESI2234567891',
      routingNumber: '123456789',
      accountType: AccountType.SAVINGS,
      accountStatus: AccountStatus.ACTIVE,
      balance: 15000.0,
      currency: 'PKR',
      nickname: 'Emergency Fund',
    },
  });

  const user1CreditCard = await prisma.account.create({
    data: {
      userId: user1.id,
      accountNumber: '3234567892',
      iban: 'PK36DESI3234567892',
      routingNumber: '123456789',
      accountType: AccountType.CREDIT_CARD,
      accountStatus: AccountStatus.ACTIVE,
      balance: -1200.0,
      currency: 'PKR',
      creditLimit: 5000.0,
      availableCredit: 3800.0,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      nickname: 'Rewards Card',
    },
  });

  // Create accounts for user2
  const user2CurrentAccount = await prisma.account.create({
    data: {
      userId: user2.id,
      accountNumber: '1234567893',
      iban: 'PK36DESI1234567893',
      routingNumber: '123456789',
      accountType: AccountType.CURRENT,
      accountStatus: AccountStatus.ACTIVE,
      balance: 8500.0,
      currency: 'PKR',
      nickname: 'Personal Checking',
    },
  });

  const user2SavingsAccount = await prisma.account.create({
    data: {
      userId: user2.id,
      accountNumber: '2234567894',
      iban: 'PK36DESI2234567894',
      routingNumber: '123456789',
      accountType: AccountType.SAVINGS,
      accountStatus: AccountStatus.ACTIVE,
      balance: 25000.0,
      currency: 'PKR',
      nickname: 'Vacation Fund',
    },
  });

  console.log('✅ Created 5 accounts');

  // Create transactions for user1
  console.log('💸 Creating transactions...');
  
  // Salary deposit
  await prisma.transaction.create({
    data: {
      accountId: user1CurrentAccount.id,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.SALARY,
      amount: 3500.0,
      currency: 'PKR',
      balanceAfter: 5000.0,
      description: 'Monthly Salary',
      merchant: 'Employer Inc.',
      reference: 'TXN-1707598800-ABC123',
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Grocery shopping
  await prisma.transaction.create({
    data: {
      accountId: user1CurrentAccount.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.GROCERIES,
      amount: -150.5,
      currency: 'PKR',
      balanceAfter: 4849.5,
      description: 'Grocery Shopping',
      merchant: 'Whole Foods',
      reference: 'TXN-1707685200-DEF456',
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  // Restaurant
  await prisma.transaction.create({
    data: {
      accountId: user1CreditCard.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.DINING,
      amount: -85.0,
      currency: 'PKR',
      balanceAfter: -1200.0,
      description: 'Dinner at Restaurant',
      merchant: 'Italian Bistro',
      reference: 'TXN-1707771600-GHI789',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Transfer to savings
  await prisma.transaction.create({
    data: {
      accountId: user1CurrentAccount.id,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.TRANSFER,
      amount: -1000.0,
      currency: 'PKR',
      balanceAfter: 3849.5,
      description: 'Transfer to Emergency Fund',
      reference: 'TXN-1707858000-JKL012',
      toAccountId: user1SavingsAccount.id,
      fromAccountId: user1CurrentAccount.id,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      accountId: user1SavingsAccount.id,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.TRANSFER,
      amount: 1000.0,
      currency: 'PKR',
      balanceAfter: 15000.0,
      description: 'Transfer from Main Checking',
      reference: 'TXN-1707858001-JKL013',
      toAccountId: user1SavingsAccount.id,
      fromAccountId: user1CurrentAccount.id,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Utility bill
  await prisma.transaction.create({
    data: {
      accountId: user1CurrentAccount.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.UTILITIES,
      amount: -120.0,
      currency: 'PKR',
      balanceAfter: 3729.5,
      description: 'Electric Bill',
      merchant: 'Power Company',
      reference: 'TXN-1707944400-MNO345',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Create transactions for user2
  await prisma.transaction.create({
    data: {
      accountId: user2CurrentAccount.id,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.SALARY,
      amount: 4200.0,
      currency: 'PKR',
      balanceAfter: 8500.0,
      description: 'Monthly Salary',
      merchant: 'Tech Corp',
      reference: 'TXN-1707598800-PQR678',
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      accountId: user2CurrentAccount.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      category: TransactionCategory.SHOPPING,
      amount: -250.0,
      currency: 'PKR',
      balanceAfter: 8250.0,
      description: 'Online Shopping',
      merchant: 'Amazon',
      reference: 'TXN-1707685200-STU901',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Created 8 transactions');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  - Users: 3 (1 admin, 2 regular users)');
  console.log('  - Accounts: 5 (2 current, 2 savings, 1 credit card)');
  console.log('  - Transactions: 8');
  console.log('\n🔑 Login Credentials:');
  console.log('  Admin: admin@example.com / Admin123!');
  console.log('  User1: john@example.com / User123!');
  console.log('  User2: jane@example.com / User123!');
}

main()
  .catch((e: Error) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
