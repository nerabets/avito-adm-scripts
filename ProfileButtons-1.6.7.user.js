// ==UserScript==
// @name         ProfileButtons
// @namespace
// @version      1.6.7
// @description  Fast buttons in profile
// @description:ru  Быстрые кнопки в профиле пользователя
// @author       nerabets scripts
// @copyright   
// @match        change me
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let settings = [
        {
            display_sticky : true
        }
    ]

    let buttons = [
        {
            display_name : "Email",
            name : 'version',
            enabled : true
        },
        {
            display_name : "Верификация",
            name : 'verification',
            color : "btn-danger",
            enabled : true
        },
        {
            display_name : "Сообщения",
            name : 'messager',
            color : 'btn-warning',
            enabled : true
        },
        {
            display_name : "Связка",
            name : 'passport',
            color : "btn-primary",
            enabled : true
        },
        {
            display_name : "Кошелёк",
            name : 'wallet',
            color : "btn-success",
            enabled : true
        },

        {
            display_name : "Объявления",
            name : 'items',
            color : "btn-primary",
            enabled : true
        },
        {
            display_name : "Отзывы на",
            name : "reviews_to",
            color : "btn-warning",
            enabled : true
        },
        {
            display_name : "Отзывы от",
            name : "reviews_from",
            color : "btn-warning",
            enabled : true
        },
        {
            display_name : "Доставка (покупатель)",
            name : "delivery_buyer",
            color : "btn-info",
            enabled : true
        },
        {
            display_name : "Доставка (продавец)",
            name : "delivery_seller",
            color : "btn-info",
            enabled : true
        },
        {
            display_name : "Репутация",
            name : "reputation",
            color : "btn-primary",
            enabled : true
        },
        {
            display_name : "FinTech",
            name : "fintech",
            color : "btn-danger",
            enabled : true
        },
        {
            display_name : "Двухфакторная / Антихак",
            name : "2fa",
            color : "btn-success",
            enabled : true
        },
        
    ]

    class Button {
        constructor(color, text) {
            this.color = color
            this.text = text
            this.ui = document.createElement('button', this.color)
            this.ui.classList.add(this.color)
            this.ui.classList.add('btn')
            this.ui.style.marginLeft = '10px'
            this.ui.innerHTML = this.text
            return(this.ui)
        }
    }

    let getUserId = () => { return (document.URL.split('/')[6])}
    let getPasportID = () => {
        let passport = document.querySelector('.js-passport-id')

        if((passport.getAttribute('data-passport-enable')) == false) {
            alert('Паспорт выключен')
        } else {return(passport.getAttribute('data-passport-id'))}
    }


    let nr_verification = () => {window.open("#" + getUserId(), "_blank")}
    let nr_wallet = () => {window.open("#" + getUserId())}
    let nr_passport = () => {window.open("#" + getPasportID())}
    let nr_fintech = () => {window.open("#" + getUserId())}
    let nr_items = () => {window.open("#" + getUserId())}
    let nr_reviews_from = () => {window.open("#" + getUserId() + "%2C%22reviewType%22%3A%22seller%22%7D" )}
    let nr_reviews_to = () => {window.open("#" + getUserId() + "%2C%22reviewType%22%3A%22seller%22%7D" )}
    let nr_delivery_buyer = () => {window.open("#" + getUserId())}
    let nr_delivery_seller = () => {window.open("#" + getUserId())}
    let nr_reputation = () => {window.open("#" + getUserId(), "_blank")}
    let nr_2fa = () => {
        fetch("#"+ getUserId() +"/antihack_status", {
            "headers": {
                "accept": "*/*",
                "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                "sec-ch-ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest"
            },
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
            })
            .then(response => response.json())
            .then(data => {
                if(data.success == true) {
                    alert('Двухфакторная :' + data.isTwoFAEnabled + "\n Антихак: " + data.needConfirm)
                    if(data.isTwoFAEnabled == true) {
                        let open_reg_2fa = confirm("Открыть регламент!?")
                        if(open_reg_2fa == true) {
                            window.open('#', "_blank")
                        }
                    }
                    if(data.isTwoFAEnabled == false && data.needConfirm == true) {
                        let open_reg_antihack = confirm("Открыть регламент?")
                        if(open_reg_antihack == true) {
                            window.open('#', "_blank")
                        }
                    }
                } else {
                    alert('Упс... Что-то пошло не так. Попробуй ещё раз...')
                }
            })
    }
    let nr_messager = () => {window.open("#"+ getUserId() +"&userRole=all", "_blank")
    }
    let nr_version = () => {
        let email_field = document.querySelector('.fakeemail-field')
        navigator.clipboard.writeText(email_field.innerHTML)
    }

    let head_panel = document.createElement('div')




    buttons.forEach((element) => {
        if(element.enabled == true) {
            let item = new Button(element.color, element.display_name)
            item.id = 'nr_' + element.name
            item.addEventListener("click", (e) => {
                switch (e.target.id) {
                    case 'nr_wallet':
                        nr_wallet()
                        break
                    case 'nr_verification':
                        nr_verification()
                        break
                    case 'nr_passport':
                        nr_passport()
                        break
                    case 'nr_items':
                        nr_items()
                        break
                    case 'nr_reviews_to':
                        nr_reviews_to()
                        break
                    case 'nr_reviews_from':
                        nr_reviews_from()
                        break
                    case 'nr_delivery_buyer':
                        nr_delivery_buyer()
                        break
                    case 'nr_delivery_seller':
                        nr_delivery_seller()
                        break
                    case 'nr_reputation':
                        nr_reputation()
                        break
                    case 'nr_2fa':
                        nr_2fa()
                        break
                    case 'nr_messager':
                        nr_messager()
                        break
                    case 'nr_fintech':
                        nr_fintech()
                        break
                    case 'nr_version':
                        nr_version()
                        break
                }
            })
            head_panel.appendChild(item)
        }
    });



    fetch("#" + getUserId() + "/emails/history", {
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "ru,en;q=0.9",
            "sec-ch-ua": "\"Chromium\";v=\"118\", \"YaBrowser\";v=\"23.11\", \"Not=A?Brand\";v=\"99\", \"Yowser\";v=\"2.5\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest"
        },
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
        }).then(response => response.json())
        .then(data => {
            let historyEmail = document.querySelector('.js-history')
            historyEmail.innerHTML = data.content
        }
            )


    let header = document.querySelector('.header')

    header.style.marginTop = '50px'
    head_panel.style.position = 'fixed'
    head_panel.style.padding = '10px'
    head_panel.style.width = '100%'
    head_panel.style.top = '0'
    head_panel.style.marginTop = '101px'
    head_panel.style.marginBottom = '30px'
    head_panel.style.backgroundColor = 'white'
    head_panel.style.flex
    head_panel.style.zIndex = '100'

    header.appendChild(head_panel)

  let rows = document.querySelectorAll(".row")
  let cards= rows[(rows.length-1)]

  let ebanyavrot = document.querySelector('.js-passwords')
  ebanyavrot.appendChild(cards)


})();