#!/bin/sh
set -e

echo "Starting Backend Entrypoint script..."

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run Prisma Migrations
echo "Running Prisma Migrations..."
npx prisma db push --accept-data-loss

# (Optional) Seed the database here if you have a seed script
# echo "Seeding database..."
# npx prisma db seed

# Start the application
echo "Starting Node.js application..."
exec "$@"
