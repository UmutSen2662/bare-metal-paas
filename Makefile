PYTHON := ./backend/venv/bin/python
PIP := ./backend/venv/bin/pip
MANAGE := $(PYTHON) backend/manage.py
VENV := backend/venv

.PHONY: all dev install update venv clean

# Default target
all: dev

# Ensure venv exists
$(VENV): backend/requirements.txt
	@echo "Creating Python Virtual Environment..."
	test -d $(VENV) || python3 -m venv $(VENV)
	$(PIP) install -r backend/requirements.txt
	@touch $(VENV)

# Alias for venv creation
venv: $(VENV)

# Install the PaaS (Root required)
install: venv
	@echo "Starting Installation..."
	@sudo $(MANAGE) install

# Update the PaaS (Root required)
update:
	@echo "Pulling latest code..."
	@git pull
	@$(MAKE) venv
	@echo "Running Update Script..."
	@sudo $(MANAGE) update

# Run in Development Mode
dev: venv
	@echo "Starting Development Server..."
	@sudo $(MANAGE) dev

# Clean up venv and artifacts
clean:
	rm -rf $(VENV)
	rm -rf frontend/dist
	rm -rf frontend/node_modules
