SHELL:=/bin/bash
UNAME:=$(shell uname)

install= \
	pip install -e .

start= \
	python label_studio/server.py start labeling_project --init

start:
	$(call start)

install:
	$(call install)
