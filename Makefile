APP = npm run
CAP = npx cap
DEV_PORT = 5174
# First phone in `adb devices`, so Capacitor does not ask which device to use.
PHONE = $(shell adb devices 2>/dev/null | awk 'NR > 1 && $$2 == "device" { print $$1; exit }')

all: check

#-----	Quality (same checks as CI)	-----#

format:
	$(APP) format

formatCheck:
	$(APP) format:check

lint:
	$(APP) lint

lintCheck:
	$(APP) lint:check

build:
	$(APP) build

test:
	$(APP) test

testVerbose:
	$(APP) test -- --reporter=verbose

check: formatCheck lintCheck build test

#-----	Phone (connected with adb)	-----#

# Builds the app and installs it on the phone, working without the computer.
phone: build hasPhone
	$(CAP) run android --target $(PHONE)

# Live development, in two terminals: `make dev` serves the code, then
# `make live` installs an app that loads it through the USB cable and reloads
# on every change. Stop `make live` with Ctrl+C, then `make phone` to get the
# normal app back.
dev:
	$(APP) dev -- --host 127.0.0.1 --port $(DEV_PORT) --strictPort

live: hasPhone
	$(CAP) run android --target $(PHONE) --live-reload --host localhost --port $(DEV_PORT) --forwardPorts $(DEV_PORT):$(DEV_PORT)

hasPhone:
	@test -n "$(PHONE)" || { echo "No phone found: check adb devices"; exit 1; }

.PHONY: all format formatCheck lint lintCheck build test testVerbose check \
	phone dev live hasPhone
