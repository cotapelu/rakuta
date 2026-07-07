.PHONY: quality lint typecheck test coverage build security-scan

# Run all quality checks (lint, typecheck, test, coverage, security)
quality: lint typecheck test coverage security-scan

# Lint code with ESLint (auto-fix)
lint:
	@echo "Running lint..."
	npm run lint

# Type-check with TypeScript
typecheck:
	@echo "Running type check..."
	npm run typecheck

# Run tests (no coverage)
test:
	@echo "Running tests..."
	npm test

# Run tests with coverage (generates coverage report)
coverage:
	@echo "Running tests with coverage..."
	npm test -- --coverage

# Build the project
build:
	@echo "Building project..."
	npm run build

# Security audit (npm vulnerabilities)
security-scan:
	@echo "Running security audit..."
	npm audit --audit-level=high || true

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm ci

# Clean (remove coverage, dist)
clean:
	rm -rf coverage dist .tsbuildinfo
