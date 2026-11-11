APP = npm run
CAP = npx cap
# Port of the live development server, not Vite's 5173 that another project
# often holds. Give the same one to both: `make dev DEV_PORT=5180`, then
# `make live DEV_PORT=5180`.
DEV_PORT ?= 5174
VERSION = $(shell node -p "require('./package.json').version")
# The release key, ignored by git (see Releases in CONTRIBUTING.md).
KEYSTORE = catchmeal-release.jks
RELEASE_APK = release/catchmeal-$(VERSION).apk
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

# Unused files, exports and dependencies, worth a look before a release.
knip:
	$(APP) knip

#-----	Phone (connected with adb)	-----#

# Builds the development app, "CatCHMeal dev", and installs it on the phone
# beside the real one, with its own data.
phone: build hasPhone
	$(CAP) run android --target $(PHONE)

# The development app as an APK file, to copy to the phone and open there.
APK = android/app/build/outputs/apk/debug/app-debug.apk

apk: build
	$(CAP) sync android
	cd android && ./gradlew assembleDebug
	@echo "APK ready: $(APK)"

#-----	Release (signed with the release key)	-----#

# Builds the real app, signed, as release/catchmeal-<version>.apk: the file of
# the GitHub release, and the update of the phone's daily app.
release: build hasKey
	$(CAP) sync android
	cd android && ./gradlew assembleRelease
	@mkdir -p release
	cp android/app/build/outputs/apk/release/app-release.apk $(RELEASE_APK)
	@echo "Release ready: $(RELEASE_APK)"

# Installs that APK on the phone, as an update that keeps the data.
installRelease: hasPhone
	@test -f $(RELEASE_APK) || { echo "No $(RELEASE_APK): run make release first"; exit 1; }
	adb -s $(PHONE) install -r $(RELEASE_APK)

hasKey:
	@test -f $(KEYSTORE) -a -f .password || { echo "No release key: see Releases in CONTRIBUTING.md"; exit 1; }

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

.PHONY: all format formatCheck lint lintCheck build test testVerbose check knip \
	phone apk release installRelease dev live hasPhone hasKey
