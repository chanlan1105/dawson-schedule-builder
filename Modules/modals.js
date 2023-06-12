String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

var alertQueue = {
	busy: false,
	queue: [],
	next: function() {
		if (alertQueue.queue.length == 0) {
			alertQueue.busy = false;
		}
		else {
			alertQueue.queue[0]();
			alertQueue.queue.shift();
		}
	}
};

$(document).ready(() => {
    $(".alert-modal").on("hidden.bs.modal", alertQueue.next);
});

window.alert = async function(msg, html = false) {
	if (alertQueue.busy) {
		await new Promise(resolve => {
			alertQueue.queue.push(() => {
				resolve();
			});
		});
	}
	else {
		alertQueue.busy = true;
	}
	
	$("#alert-modal-content")[html ? "html" : "text"](msg);
	$("#alert-modal").modal("show");
	
	$("#alert-modal .btn").focus();
	
	let promise = new Promise(resolve => {
		$("#alert-modal .btn").off("click.alert").on("click.alert", () => {
			resolve();
		});
	});
	
	return promise;
};
window.confirm = async function(msg, buttons = "yes no") {
	if (alertQueue.busy) {
		await new Promise(resolve => {
			alertQueue.queue.push(() => {
				resolve();
			});
		});
	}
	else {
		alertQueue.busy = true;
	}
	
    $("#special-confirm-buttons").hide();
    $("#confirm-buttons").show();
	
	let promise = new Promise(resolve => {
		$("#confirm-modal .yes").off("click.confirm").on("click.confirm", () => {
			resolve(true);
		});
		$("#confirm-modal .no").off("click.confirm").on("click.confirm", () => {
			resolve(false);
		});
	});
	
	let words = buttons.split(" ").map(word => word.capitalize());
	if (words.length != 2) throw new Error("buttons in window.confirm must be two words separated by a space");
	
	$("#confirm-modal-content").text(msg);
	$("#confirm-modal").modal("show");
	
	$("#confirm-modal .modal-body .yes").text(words[0]);
	$("#confirm-modal .modal-body .no").text(words[1]);
	
	$("#confirm-modal .modal-body > div > .yes").focus();
	
	return promise;
}
window.prompt = async function(msg, placeholder = "", defaultMsg = "", dataset = false) {
	if (alertQueue.busy) {
		await new Promise(resolve => {
			alertQueue.queue.push(() => {
				resolve();
			});
		});
	}
	else {
		alertQueue.busy = true;
	}
	
	$("#prompt-modal-content").text(msg);
	$("#prompt-modal").modal("show");
	$("#prompt-input").attr("placeholder", placeholder).val(defaultMsg).select();
	
   $("#prompt-input").off("keydown.autocomplete input.autocomplete");
	dataset && autocomplete($("#prompt-input"), dataset);
	
	let promise = new Promise(resolve => {
		$("#prompt-modal .yes").off("click.prompt").on("click.prompt", () => {
			resolve($("#prompt-input").val().remove(" ") == "" ? null : $("#prompt-input").val());
		});
		$("#prompt-modal .no").off("click.prompt").on("click.prompt", () => {
			resolve(false);
		});
	});
	
	return promise.then(result => result);
}