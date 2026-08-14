import prisma from '../config/db';
import bcrypt from 'bcrypt';

async function main() {
  const emailArg = process.argv[2];
  const newPasswordArg = process.argv[3];

  if (!emailArg || !newPasswordArg) {
    console.log('Usage: npx ts-node src/scripts/reset-password.ts <email> <new_password>');
    console.log('\nListing current users in database:');
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    if (users.length === 0) {
      console.log('No users found in database. You can register a new account on the website, which will automatically become the ADMIN.');
    } else {
      console.table(users);
    }
    process.exit(0);
  }

  const user = await prisma.user.findUnique({
    where: { email: emailArg.trim().toLowerCase() }
  });

  if (!user) {
    console.error(`User with email "${emailArg}" not found.`);
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPasswordArg, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  console.log(`Successfully updated password for ${user.email} (${user.role}). You can now log in with your new password!`);
}

main()
  .catch((e) => {
    console.error('Error resetting password:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
