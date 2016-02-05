/* jshint moz: true */
$( document ).ready( function () {
    const REGEX = /[Rr]evert|rv\ |rvv\ |undid/ig;
    const MAX_REVERT_AGE = 60 * 60 * 1000; // one hour
    const DIFF_PAGE = "https://en.wikipedia.org/w/index.php?diff=";
    var reverts = [];
    var startTime = new Date().getTime(); // will be reset
    // See http://socket.io/
    var socket = io.connect('stream.wikimedia.org/rc');
    
    var feedNode = document.getElementById('feed');
    var errorNode = document.createElement('div');
    errorNode.className = 'alert alert-danger';
    printEvent({
        type: 'info',
        'message': 'Subscribed! Waiting for a revert...'
    });
    socket.on('connect', function() {
        // Subscribe to one or more wikis
        // See https://wikitech.wikimedia.org/wiki/RCStream
        socket.emit('subscribe', 'en.wikipedia.org');
        startTime = new Date().getTime();
    });

    socket.on('change', function(rc) {
        // See https://www.mediawiki.org/wiki/Manual:RCFeed#Properties
        if (rc.type == 'edit') {
            printEvent({
                type: 'rc',
                data: rc
            });
        }
    });

    socket.on('error', function(data) {
        printEvent({
            type: 'error',
            data: data
        });
    });

    function refreshRpm() {
        // Prune list of reverts
        reverts = reverts.filter( function ( time ) {
            return ( new Date().getTime() ) - time <= MAX_REVERT_AGE;
        } );

        // Calculate average
        var ms_since_start = ( new Date().getTime() ) - startTime;
        var duration_of_average = Math.min( ms_since_start, MAX_REVERT_AGE );
        var rpm = ( reverts.length / duration_of_average ) * 60 * 1000;
        $( "#rpm" ).html( rpm.toFixed( 3 ) );
        $( "#rpm-code" ).html( rpm.toFixed( 0 ) );
        $( "#rpm-info" ).html( reverts.length + " reverts over " + ( duration_of_average / ( 1000 ) ) + " seconds" );
    }

    $( "#update" ).click( function () {
        refreshRpm();
        cropFeed();
    } );

    $( "#show-code" ).click( function () {
        $( "#code" ).animate( { opacity: "toggle" }, "fast" );
        $( "#show-code" ).text( $( "#show-code" ).text() == "Show code" ? "Hide code" : "Show code" );
    } );

    function printEvent(event) {
        if (event.type === 'rc') {
            if(REGEX.test(event.data.comment)) {
                pushToFeed( $( "<span>" )
                            .append( JSON.stringify( event.data ) + " " )
                            .append( $( "<a>" )
                                     .attr( "href", DIFF_PAGE +
                                            event.data.revision.new )
                                     .text( "(diff)" ) )
                            .append( "\n" ) );

                reverts.push(new Date().getTime());

                refreshRpm();
            }
        } else if (event.type === 'error') {
            $(errorNode).empty().text(JSON.stringify(event.data));
            if (!errorNode.parentNode) {
                $(feedNode).before(errorNode);
            }
        } else if (event.type === 'info') {
            pushToFeed( $('<div>')
                        .addClass('alert alert-info')
                        .text(event.message)
                        .get(0) );
        }
    }

    function pushToFeed( element ) {
        $( feedNode ).prepend( element );
        cropFeed();
    }

    function cropFeed() {
        if( $( "#buffer-size" ).val() < 2 ) return;

        if( $( feedNode ).children().length >= $( "#buffer-size" ).val() ) {
            $( feedNode ).children().last().remove();
        }
    }
} );
