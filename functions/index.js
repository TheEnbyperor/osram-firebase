const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.notifyOrder = functions.database.ref('/pendingOrders/{orderId}').onCreate((event) => {
    const order = event.data;
    const orderData = order.val();
    console.log(`New order, id: ${event.params.orderId}`);

    const uid = orderData.uid;
    return admin.database().ref(`/messagingIds/${uid}`).once('value').then(clientMessagingToken => {
        clientMessagingToken = clientMessagingToken.val();
        if (clientMessagingToken) {
            return admin.database().ref(`/location/${uid}`).once('value').then(locationData => {
                locationData = locationData.val();
                if ((Math.floor(Date.now() / 1000) - locationData.timestamp) > 60) {
                    console.log(`Location for ${uid} too old`);
                    const payload = {
                        notification: {
                            title: 'Order unable to be placed',
                            body: `Your location data is not up to date enough. Make sure that you have adequate GPS reception.`
                        }
                    };
                    return admin.messaging().sendToDevice(clientMessagingToken, payload).then(() => {
                        return admin.database().ref(`/pendingOrders/${event.params.orderId}`).set(null).then(() => {
                            console.log(`Order deleted in database`);
                        });
                    });
                } else {
                    return admin.database().ref(`stalls/${orderData.stall}`).once('value').then(stallData => {
                        stallData = stallData.val();
                        return admin.database().ref(`/messagingIds/${stallData.owner}`).once('value')
                            .then(stallMessagingToken => {
                                stallMessagingToken = stallMessagingToken.val();
                                if (stallMessagingToken) {
                                    console.log(`Sending notification to ${clientMessagingToken}`);
                                    const payload = {
                                        notification: {
                                            title: 'New order',
                                            body: `A new order has been placed with you!`
                                        }
                                    };
                                    return admin.messaging().sendToDevice(stallMessagingToken, payload);
                                }
                            });
                    });
                }
            });
        }
    });
});

exports.notifyRejectOrder = functions.database.ref('/rejectedOrders/{orderId}').onCreate((event) => {
    const order = event.data;
    const orderData = order.val();
    console.log(`Rejected order, id: ${event.params.orderId}`);

    const uid = orderData.uid;
    return admin.database().ref(`/messagingIds/${uid}`).once('value').then(clientMessagingToken => {
        clientMessagingToken = clientMessagingToken.val();
        if (clientMessagingToken) {
            return admin.database().ref(`stalls/${orderData.stall}`).once('value').then(stallData => {
                stallData = stallData.val();
                const payload = {
                    notification: {
                        title: 'Order rejected',
                        body: `Your order to ${stallData.name} has been rejected by the stall. Reason given: ${orderData.reason}`
                    }
                };
                return admin.messaging().sendToDevice(clientMessagingToken, payload);
            });
        }
    });
});

exports.notifyAcceptOrder = functions.database.ref('/inProgressOrders/{orderId}').onCreate((event) => {
    const order = event.data;
    const orderData = order.val();
    console.log(`Rejected order, id: ${event.params.orderId}`);

    const uid = orderData.uid;
    return admin.database().ref(`/messagingIds/${uid}`).once('value').then(clientMessagingToken => {
        clientMessagingToken = clientMessagingToken.val();
        if (clientMessagingToken) {
            return admin.database().ref(`stalls/${orderData.stall}`).once('value').then(stallData => {
                stallData = stallData.val();
                const payload = {
                    notification: {
                        title: 'Order now in progress',
                        body: `Your order to ${stallData.name} is now in progress!`
                    }
                };
                return admin.messaging().sendToDevice(clientMessagingToken, payload);
            });
        }
    });
});