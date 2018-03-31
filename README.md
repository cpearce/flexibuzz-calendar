# flexibuzz-calendar
FlexiBuzz/tiqbiz interface for adding recurring calendar events

The FlexiBuzz admin interface doesn't provide a way to add recurring calendar events,
so this project provides that using the TiqBiz API.

This uses the API used by the tiqbiz WordPress plugin:
https://wordpress.org/plugins/tiqbiz-api/

Flexibuzz doesn't actually support recurring events,
so each instance of the recurring event is added as a new event.
