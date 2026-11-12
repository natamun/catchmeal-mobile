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
# The Android SDK, for Capacitor's installer. ~/.bashrc sets it for a terminal,
# but returns early in a non-interactive shell (scripts, Claude Code).
export ANDROID_HOME ?= $(HOME)/Android/Sdk
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

# Replaces the development app's data with the demo: the last 90 days up to
# today, in the phone's time zone. Never the real app: only a debug app lets
# run-as write into its files.
DEV_APP = io.github.natamun.catchmeal.debug
DEMO_DB = /tmp/catchmeal-demo.db

seed: hasPhone
	TZ=$$(adb -s $(PHONE) shell getprop persist.sys.timezone | tr -d '\r') \
		node --import ./src/test/ts-resolve.mjs src/test/seedDemoFile.ts $(DEMO_DB)
	adb -s $(PHONE) shell am force-stop $(DEV_APP)
	adb -s $(PHONE) exec-in run-as $(DEV_APP) sh -c 'cat > databases/catchmealSQLite.db; rm -f databases/catchmealSQLite.db-journal databases/catchmealSQLite.db-wal databases/catchmealSQLite.db-shm' < $(DEMO_DB)
	@echo "Demo data in CatCHMeal dev: open the app"

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
	phone apk seed release installRelease dev live hasPhone hasKey
