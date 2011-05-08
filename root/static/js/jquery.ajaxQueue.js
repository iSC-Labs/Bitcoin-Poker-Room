(function($) {

    $.ajax_queue = $.ajax;
    pendingRequests = {},
    synced = [],
    syncedData = [],
    ajaxRunning = [];

    $.ajax = function(settings) {
        // create settings for compatibility with ajaxSetup
        settings = jQuery.extend(settings, jQuery.extend({}, jQuery.ajaxSettings, settings));

        var port = settings.port;

        if (settings.mode == 'direct') {
          port = port + "-direct";
          settings.mode = 'queue';
        }

        settings.retry = 1;
    
        switch (settings.mode) {
            case "abort":
                if (pendingRequests[port]) {
                    pendingRequests[port].abort();
                }
                return pendingRequests[port] = $.ajax_queue.apply(this, arguments);
                
            case "direct":
                $.ajax_queue(settings);
                return;
                
            case "queue":
                var _old = settings.complete;
                settings.complete = function() {
                    if (jQuery([$.ajax_queue]).queue("ajax" + port).length > 0) {
                        jQuery([$.ajax_queue]).dequeue("ajax" + port);
                    } else {
                        ajaxRunning[port] = false;
                    }
                    if (_old) {
                        _old.apply(this, arguments);
                    }
                };

                jQuery([$.ajax_queue]).queue("ajax" + port, function() {
                    $.ajax_queue(settings);
                });

                if (jQuery([$.ajax_queue]).queue("ajax" + port).length == 1 && !ajaxRunning[port]) {
                    ajaxRunning[port] = true;
                    jQuery([$.ajax_queue]).dequeue("ajax" + port);
                }

                return;
            case "sync":
                var pos = synced.length;

                synced[pos] = {
                    error: settings.error,
                    success: settings.success,
                    complete: settings.complete,
                    done: false
                };

                syncedData[pos] = {
                    error: [],
                    success: [],
                    complete: []
                };

                settings.error = function() { syncedData[pos].error = arguments; };
                settings.success = function() { syncedData[pos].success = arguments; };
                settings.complete = function() {
                    syncedData[pos].complete = arguments;
                    synced[pos].done = true;

                    if (pos == 0 || !synced[pos - 1])
                        for (var i = pos; i < synced.length && synced[i].done; i++) {
                        if (synced[i].error) synced[i].error.apply(jQuery, syncedData[i].error);
                        if (synced[i].success) synced[i].success.apply(jQuery, syncedData[i].success);
                        if (synced[i].complete) synced[i].complete.apply(jQuery, syncedData[i].complete);

                        synced[i] = null;
                        syncedData[i] = null;
                    }
                };
        }
        return $.ajax_queue.apply(this, arguments);
    };

})(jQuery);