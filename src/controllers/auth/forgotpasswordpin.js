import globalize from 'globalize';

/* eslint-disable indent */

    function processForgotPasswordResult(result) {
        if (result.Success) {
            let msg = globalize.translate('MessagePasswordResetForUsers');
            msg += '<br/>';
            msg += '<br/>';
            msg += result.UsersReset.join('<br/>');
            return void Dashboard.alert({
                message: msg,
                title: globalize.translate('HeaderPasswordReset'),
                callback: function () {
                    window.location.href = 'index.html';
                }
            });
        }

        Dashboard.alert({
            message: globalize.translate('MessageInvalidForgotPasswordPin'),
            title: globalize.translate('HeaderPasswordReset')
        });
    }

    export default function (view, params) {
        function onSubmit(e) {
            ApiClient.ajax({
                type: 'POST',
                url: ApiClient.getUrl('Users/ForgotPassword/Pin'),
                dataType: 'json',
                data: {
                    Pin: view.querySelector('#txtPin').value
                }
            }).then(processForgotPasswordResult);
            e.preventDefault();
            return false;
        }

        view.querySelector('form').addEventListener('submit', onSubmit);
    }

/* eslint-enable indent */
