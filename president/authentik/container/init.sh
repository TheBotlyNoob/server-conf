#!/bin/sh

# change `default=Themes.AUTOMATIC` to `default=Themes.DARK` in `/authentik/brands/api.py`

# see https://stackoverflow.com/questions/77256594
sed 's/default=Themes\.AUTOMATIC/default=Themes\.DARK/g' /authentik/brands/api.py >/authentik/brands/api.py.tmp
mv /authentik/brands/api.py.tmp /authentik/brands/api.py

dumb-init -- ak server
