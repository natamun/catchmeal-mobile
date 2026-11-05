all: check

#-----	CI / Quality	-----#

format:
	npm run format --prefix frontend
	npm run format --prefix backend

formatCheck:
	npm run format:check --prefix frontend
	npm run format:check --prefix backend

lint:
	npm run lint --prefix frontend
	npm run lint --prefix backend

lintCheck:
	npm run lint:check --prefix frontend
	npm run lint:check --prefix backend

build:
	npm run build --prefix frontend
	npm run build --prefix backend

test:
	npm run test --prefix frontend
	npm run test --prefix backend

testVerbose:
	npm run test --prefix frontend -- --reporter=verbose
	npm run test --prefix backend -- --verbose

check: formatCheck lintCheck build test

migrate:
	cd backend && npx prisma migrate dev --name $(name)

.PHONY: all format formatCheck lint lintCheck build test testVerbose check migrate
