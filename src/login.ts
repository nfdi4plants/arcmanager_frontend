export const fetchUrl = (target:string) => {
    let resultUrl;
    switch(target){
        case "Freiburg":
            resultUrl = "https://git.nfdi4plants.org";
            break;
        case "Tübingen":
            resultUrl = "https://gitlab.nfdi4plants.de";
            break;
        default:
            resultUrl = "https://gitlab.nfdi4plants.de";
            break;
    }
    return resultUrl;
}

export const loginUrl = (target:string) => {
    let resultUrl;
    switch(target) {
        case "Freiburg":
            resultUrl = "Gitlab";
            break;
        case "Tübingen":
            resultUrl = "Gitlab_Tu";
            break;
        case "Dev":
            resultUrl = "Gitlab_Dev"
            break;
        case "Plantmicrobe":
            resultUrl = "Gitlab_Pm"
            break;
        default:
            resultUrl = "Gitlab_Dev";
            break;
}
     return resultUrl;
}