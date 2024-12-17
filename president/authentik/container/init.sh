#!/bin/sh

# change `default=Themes.AUTOMATIC` to `default=Themes.DARK` in `/authentik/brands/api.py`
sed -i 's/default=Themes\.AUTOMATIC/default=Themes\.DARK/g' /authentik/brands/api.py

dumb-init -- ak server
