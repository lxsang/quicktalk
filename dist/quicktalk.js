class QuickTalk {
    constructor(opt) {
        this.options = opt;
        if (typeof this.options.target === "string") {
            this.options.target = document.getElementById(this.options.target);
        }
        this.preview_on = false;
        this.instant_compose = undefined;
        let editor = document.createElement("div");
        let compose_button = document.createElement("button");
        compose_button.setAttribute("class", "quick-talk-compose-button");
        compose_button.textContent = "Write a comment";
        this.options.target.appendChild(compose_button);
        this.options.target.appendChild(editor);
        let container = this.load_thread(this.options.target);
        compose_button.addEventListener("click", (event) => {
            if (this.instant_compose) {
                this.instant_compose.parentNode.removeChild(this.instant_compose);
            }
            this.instant_compose = this.compose(editor, 0, true, (data) => {
                this.show_comment(container, data, true).scrollIntoView();
            });
        });
    }
    request(uri, data, callback) {
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST", uri, true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState == 4) {
                if (xhttp.status == 200) {
                    if (callback) {
                        callback(JSON.parse(xhttp.responseText));
                    }
                }
                else {
                    this.error(xhttp.statusText);
                }
            }
        };
        if (data) {
            xhttp.send(JSON.stringify(data));
        }
        else {
            xhttp.send();
        }
    }
    set_status(type, msg) {
        if (this.status_el) {
            this.status_el.innerHTML = type + ": " + msg;
        }
        else {
            console.log(type + ": " + msg);
        }
    }
    clear_status() {
        this.status_el.innerHTML = "";
    }
    info(msg) {
        this.set_status("INFO", msg);
    }
    error(obj) {
        console.log(obj);
        this.set_status("ERROR", obj.toString());
    }
    compose(at, cid, auto_hide, callback) {
        let preview = document.createElement("div");
        preview.setAttribute("class", "quick-talk-preview");
        preview.style.display = "none";
        let container = document.createElement("div");
        container.setAttribute("class", "quick-talk-compose");
        let name = document.createElement("input");
        name.value = "Name";
        name.addEventListener("focus", (event) => {
            if (name.value == "Name") {
                name.value = "";
            }
        });
        name.addEventListener("blur", (event) => {
            if (name.value.trim() == "") {
                name.value = "Name";
            }
        });
        let email = document.createElement("input");
        email.value = "Email";
        email.addEventListener("focus", (event) => {
            if (email.value == "Email") {
                email.value = "";
            }
        });
        email.addEventListener("blur", (event) => {
            if (email.value.trim() == "") {
                email.value = "Email";
            }
        });
        let ta = document.createElement("textarea");
        ta.onkeydown = (e) => {
            if (e.keyCode === 9) {
                // tab was pressed
                // get caret position/selection
                var val = ta.value, start = ta.selectionStart, end = ta.selectionEnd;
                // set textarea value to: text before caret + tab + text after caret
                ta.value =
                    val.substring(0, start) + "    " + val.substring(end);
                // put caret at right position again
                ta.selectionStart = ta.selectionEnd = start + 4;
                // prevent the focus lose
                return false;
            }
        };
        let footer = document.createElement("div");
        footer.setAttribute("class", "quick-talk-compose-footer");
        this.status_el = document.createElement("div");
        let bt_preview = document.createElement("button");
        bt_preview.textContent = "Preview";
        bt_preview.addEventListener("click", (event) => {
            let md = { data: ta.value };
            if (!this.preview_on && ta.value.trim() != "") {
                this.request(this.options.api_uri + "/preview", md, (ret) => {
                    if (ret.result) {
                        ta.style.display = "none";
                        preview.innerHTML = ret.result;
                        preview.style.display = "block";
                        bt_preview.textContent = "Edit";
                        this.preview_on = !this.preview_on;
                    }
                    else {
                        this.error(ret.error);
                    }
                });
            }
            else {
                ta.style.display = "block";
                preview.style.display = "none";
                bt_preview.textContent = "Preview";
                this.preview_on = !this.preview_on;
            }
        });
        let bt_submit = document.createElement("button");
        bt_submit.textContent = "Send";
        bt_submit.addEventListener("click", (event) => {
            this.clear_status();
            if (name.value.trim() == "" ||
                name.value.trim() == "Name" ||
                email.value.trim() == "" ||
                email.value.trim() == "Email" ||
                ta.value.trim() == "") {
                this.info("Please enter all the fields");
                return;
            }
            // check for email
            let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (!re.test(String(email.value).toLowerCase()))
                return this.info("Email is not correct");
            // send the post request
            let data = {
                page: {
                    uri: this.options.uri,
                },
                comment: {
                    name: name.value,
                    email: email.value,
                    rid: cid,
                    content: ta.value,
                },
            };
            if (this.options.author) {
                data.author =
                    this.options.author.first + "@" + this.options.author.last;
            }
            this.request(this.options.api_uri + "/post", data, (ret) => {
                if (ret.result) {
                    // TODO: more check goes here
                    name.value = "Name";
                    email.value = "Email";
                    ta.value = "";
                    if (auto_hide) {
                        at.removeChild(container);
                        this.instant_compose = undefined;
                    }
                    if (callback) {
                        callback(ret.result);
                    }
                }
                else {
                    this.error(ret.error);
                }
            });
        });
        footer.appendChild(this.status_el);
        footer.appendChild(bt_preview);
        footer.appendChild(bt_submit);
        container.appendChild(name);
        container.appendChild(email);
        container.appendChild(ta);
        container.appendChild(preview);
        container.appendChild(footer);
        at.appendChild(container);
        container.scrollIntoView();
        return container;
    }
    load_thread(at) {
        let container = document.createElement("div");
        container.setAttribute("class", "quick-talk-comment-thread");
        at.appendChild(container);
        this.request(this.options.api_uri, { page: this.options.uri }, (ret) => {
            if (ret.result) {
                ret.result.forEach((comment) => {
                    this.show_comment(container, comment, true);
                });
            }
            else {
                this.error(ret.error);
            }
            if (this.options.onload) {
                this.options.onload();
            }
        });
        return container;
    }
    show_comment(at, comment, show_footer) {
        let container = document.createElement("div");
        container.setAttribute("class", "quick-talk-comment");
        let header = document.createElement("div");
        header.setAttribute("class", "quick-talk-comment-header");
        let username = document.createElement("span");
        username.setAttribute("class", "quick-talk-comment-user");
        let time = document.createElement("span");
        time.setAttribute("class", "quick-talk-comment-time");
        let content = document.createElement("div");
        content.setAttribute("class", "quick-talk-comment-content");
        username.innerHTML = comment.name;
        let date = new Date(parseInt(comment.time) * 1000);
        time.innerHTML = `on ${date.getDate()}/${date.getMonth()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}, wrote:`;
        content.innerHTML = comment.content;
        header.appendChild(username);
        header.appendChild(time);
        container.appendChild(header);
        container.appendChild(content);
        let sub_comments = document.createElement("div");
        sub_comments.setAttribute("class", "quick-talk-sub-comment");
        if (comment.children && comment.children.length > 0) {
            comment.children.forEach((cmt) => {
                this.show_comment(sub_comments, cmt, false);
            });
        }
        container.appendChild(sub_comments);
        if (show_footer) {
            let footer = document.createElement("div");
            footer.setAttribute("class", "quick-talk-comment-footer");
            let span = document.createElement("span");
            span.innerText = "Reply";
            footer.appendChild(span);
            let editor = document.createElement("div");
            footer.appendChild(editor);
            span.addEventListener("click", (event) => {
                if (this.instant_compose) {
                    this.instant_compose.parentNode.removeChild(this.instant_compose);
                }
                this.instant_compose = this.compose(editor, parseInt(comment.id), true, (data) => {
                    this.show_comment(sub_comments, data, false);
                });
            });
            container.appendChild(footer);
        }
        at.appendChild(container);
        return container;
    }
}
