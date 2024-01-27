
function addItemInput(idInput){
    let element = document.getElementById(idInput);

    if(element && element.tagName == 'INPUT'){
        let value = parseInt(element.value, 10)

        if(isNaN(value)){
            value = 0
        }

        element.value = value + 1
    }
}
function removeItemInput(idInput){
    let element = document.getElementById(idInput);

    if(element && element.tagName == 'INPUT'){
        let value = parseInt(element.value, 10)

        if(isNaN(value)){
            value = 0
        }

        if(value > 0){
            element.value = value - 1
        }
    }
}

function showPassword(){
    let element = document.getElementById('passInput')
    let ojito = document.getElementById('ojito')

    if(element.type == 'password'){
        element.type = 'text'
        ojito.src = 'imagenes\\mdi_eye.svg'
    }else {
        element.type = 'password'
        ojito.src = 'imagenes\\eye-slash-solid 1.svg'
    }
}

function goCarrito(){
    let submitButton = document.getElementById('siguiente')
    submitButton.click()
}