geonode-sdk
===========

example of how to use an SDK application in GeoNode


Prerequisites:
- Download & unzip a copy of the Boundless SDK at http://boundlessgeo.com/solutions/solutions-software/software/
- Edit geonode-suite-sdk/build.xml:
    <property name="sdk.home" location="../location_of_SDK" />

Build:
  ant -f build.xml -Dapp.path=. -Dsdk.build=/tmp -Dapp.name=sdk2 build

Debug (port 9080):
  ant -f build.xml -Dapp.path=. -Dsdk.build=/tmp -Dapp.name=sdk2 debug