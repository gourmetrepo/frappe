// login.js
// don't remove this line (used in test)

window.disable_signup = {{ disable_signup and "true" or "false" }};

window.login = {};

window.verify = {};

login.bind_events = function() {
	$(window).on("hashchange", function() {
		login.route();
	});


	$(".form-login").on("submit", function(event) {
		event.preventDefault();
		var args = {};
		args.cmd = "login";
		args.usr = frappe.utils.xss_sanitise(($("#login_email").val() || "").trim());
		args.pwd = $("#login_password").val();
		args.device = "desktop";
		if(!args.usr || !args.pwd) {
			frappe.msgprint('{{ _("Both login and password required") }}');
			return false;
		}
		login.call(args);
		return false;
	});

	$(".form-signup").on("submit", function(event) {
		event.preventDefault();
		var args = {};
		args.cmd = "frappe.core.doctype.user.user.sign_up";
		args.email = ($("#signup_email").val() || "").trim();
		args.redirect_to = frappe.utils.get_url_arg("redirect-to") || '';
		args.full_name = frappe.utils.xss_sanitise(($("#signup_fullname").val() || "").trim());
		if(!args.email || !validate_email(args.email) || !args.full_name) {
			login.set_indicator('{{ _("Valid email and name required") }}', 'red');
			return false;
		}
		login.call(args);
		return false;
	});

	$(".form-forgot").on("submit", function(event) {
		event.preventDefault();
		var args = {};
		args.cmd = "frappe.core.doctype.user.user.reset_password";
		args.user = ($("#forgot_email").val() || "").trim();
		if(!args.user) {
			login.set_indicator('{{ _("Valid Login id required.") }}', 'red');
			return false;
		}
		login.call(args);
		return false;
	});

	$(".toggle-password").click(function() {
		$(this).toggleClass("fa-eye fa-eye-slash");
		var input = $($(this).attr("toggle"));
		if (input.attr("type") == "password") {
			input.attr("type", "text");
		} else {
			input.attr("type", "password");
		}
	});

	{% if ldap_settings and ldap_settings.enabled %}
		$(".btn-ldap-login").on("click", function(){
			var args = {};
			args.cmd = "{{ ldap_settings.method }}";
			args.usr = ($("#login_email").val() || "").trim();
			args.pwd = $("#login_password").val();
			args.device = "desktop";
			if(!args.usr || !args.pwd) {
				login.set_indicator('{{ _("Both login and password required") }}', 'red');
				return false;
			}
			login.call(args);
			return false;
		});
	{% endif %}
}


login.route = function() {
	var route = window.location.hash.slice(1);
	if(!route) route = "login";
	login[route]();
}

login.reset_sections = function(hide) {
	if(hide || hide===undefined) {
		$("section.for-login").toggle(false);
		$("section.for-forgot").toggle(false);
		$("section.for-signup").toggle(false);
	}
	$('section:not(.signup-disabled) .indicator').each(function() {
		$(this).removeClass().addClass('indicator').addClass('blue')
			.text($(this).attr('data-text'));
	});
}

login.login = function() {
	login.reset_sections();
	$(".for-login").toggle(true);
}

login.steptwo = function() {
	login.reset_sections();
	$(".for-login").toggle(true);
}

login.forgot = function() {
	login.reset_sections();
	$(".for-forgot").toggle(true);
}

login.signup = function() {
	login.reset_sections();
	$(".for-signup").toggle(true);
}


// Login
login.call = function(args, callback) {
	login.set_indicator('{{ _("Verifying...") }}', 'blue');

	return frappe.call({
		type: "POST",
		args: args,
		callback: callback,
		freeze: true,
		statusCode: login.login_handlers
	});
}

login.set_indicator = function(message, color) {
	$('section:visible .indicator')
		.removeClass().addClass('indicator').addClass(color).text(message)
}

login.login_handlers = (function() {
	var get_error_handler = function(default_message) {
		return function(xhr, data) {
			if(xhr.responseJSON) {
				data = xhr.responseJSON;
			}

			var message = default_message;
			if (data._server_messages) {
				message = ($.map(JSON.parse(data._server_messages || '[]'), function(v) {
					// temp fix for messages sent as dict
					try {
						return JSON.parse(v).message;
					} catch (e) {
						return v;
					}
				}) || []).join('<br>') || default_message;
			}

			if(message===default_message) {
				login.set_indicator(message, 'red');
			} else {
				login.reset_sections(false);
			}

		};
	}

	var login_handlers = {
		200: function(data) {
			if(data.message == 'Logged In'){
				login.set_indicator('{{ _("Success") }}', 'green');
				window.location.href = frappe.utils.get_url_arg("redirect-to") || data.home_page;
			} else if(data.message == 'Password Reset'){
				window.location.href = data.redirect_to;
			} else if(data.message=="No App") {
				login.set_indicator("{{ _("Success") }}", 'green');
				if(localStorage) {
					var last_visited =
						localStorage.getItem("last_visited")
						|| frappe.utils.get_url_arg("redirect-to");
					localStorage.removeItem("last_visited");
				}

				if(data.redirect_to) {
					window.location.href = data.redirect_to;
				}

				if(last_visited && last_visited != "/login") {
					window.location.href = last_visited;
				} else {
					window.location.href = data.home_page;
				}
			} else if(window.location.hash === '#forgot') {
				if(data.message==='not found') {
					login.set_indicator('{{ _("Not a valid user") }}', 'red');
				} else if (data.message=='not allowed') {
					login.set_indicator('{{ _("Not Allowed") }}', 'red');
				} else if (data.message=='disabled') {
					login.set_indicator('{{ _("Not Allowed: Disabled User") }}', 'red');
				} else {
					login.set_indicator('{{ _("Instructions Emailed") }}', 'green');
				}


			} else if(window.location.hash === '#signup') {
				if(cint(data.message[0])==0) {
					login.set_indicator(data.message[1], 'red');
				} else {
					login.set_indicator('{{ _("Success") }}', 'green');
					frappe.msgprint(data.message[1])
				}
				//login.set_indicator(__(data.message), 'green');
			}

			//OTP verification
			if(data.verification && data.message != 'Logged In') {
				login.set_indicator('{{ _("Success") }}', 'green');

				document.cookie = "tmp_id="+data.tmp_id;

				if (data.verification.method == 'OTP App'){
					continue_otp_app(data.verification.setup, data.verification.qrcode);
				} else if (data.verification.method == 'SMS'){
					continue_sms(data.verification.setup, data.verification.prompt);
				} else if (data.verification.method == 'Email'){
					continue_email(data.verification.setup, data.verification.prompt);
				}
			}
		},
		401: get_error_handler('{{ _("Invalid Login. Try again.") }}'),
		417: get_error_handler('{{ _("Oops! Something went wrong") }}')
	};

	return login_handlers;
} )();

frappe.ready(function() {

	login.bind_events();

	if (!window.location.hash) {
		window.location.hash = "#login";
	} else {
		$(window).trigger("hashchange");
	}

	$(".form-signup, .form-forgot").removeClass("hide");
	$(document).trigger('login_rendered');
});

var verify_token =  function(event) {
	$(".form-verify").on("submit", function(eventx) {
		eventx.preventDefault();
		var args = {};
		args.cmd = "login";
		args.otp = $("#login_token").val();
		args.tmp_id = frappe.get_cookie('tmp_id');
		if(!args.otp) {
			frappe.msgprint('{{ _("Login token required") }}');
			return false;
		}
		login.call(args);
		return false;
	});
}

var request_otp = function(r){
	$('.login-content').empty().append($('<div>').attr({'id':'twofactor_div'}).html(
		'<form class="form-verify">\
			<div class="page-card-head">\
				<span class="indicator blue" data-text="Verification">{{ _("Verification") }}</span>\
			</div>\
			<div id="otp_div"></div>\
			<input type="text" id="login_token" autocomplete="off" class="form-control" placeholder={{ _("Verification Code") }} required="" autofocus="">\
			<button class="btn btn-sm btn-primary btn-block" id="verify_token">{{ _("Verify") }}</button>\
		</form>'));
	// add event handler for submit button
	verify_token();
}

var continue_otp_app = function(setup, qrcode){
	request_otp();
	var qrcode_div = $('<div class="text-muted" style="padding-bottom: 15px;"></div>');

	if (setup){
		direction = $('<div>').attr('id','qr_info').text('{{ _("Enter Code displayed in OTP App.") }}');
		qrcode_div.append(direction);
		$('#otp_div').prepend(qrcode_div);
	} else {
		direction = $('<div>').attr('id','qr_info').text('{{ _("OTP setup using OTP App was not completed. Please contact Administrator.") }}');
		qrcode_div.append(direction);
		$('#otp_div').prepend(qrcode_div);
	}
}

var continue_sms = function(setup, prompt){
	request_otp();
	var sms_div = $('<div class="text-muted" style="padding-bottom: 15px;"></div>');

	if (setup){
		sms_div.append(prompt)
		$('#otp_div').prepend(sms_div);
	} else {
		direction = $('<div>').attr('id','qr_info').text(prompt || '{{ _("SMS was not sent. Please contact Administrator.") }}');
		sms_div.append(direction);
		$('#otp_div').prepend(sms_div)
	}
}

var continue_email = function(setup, prompt){
	request_otp();
	var email_div = $('<div class="text-muted" style="padding-bottom: 15px;"></div>');

	if (setup){
		email_div.append(prompt)
		$('#otp_div').prepend(email_div);
	} else {
		var direction = $('<div>').attr('id','qr_info').text(prompt || '{{ _("Verification code email not sent. Please contact Administrator.") }}');
		email_div.append(direction);
		$('#otp_div').prepend(email_div);
	}
}
	window.addEventListener("load", (event) => {
	$('#login_email').focus()
	$('#login_password').focus()
  });



    const canvas = document.getElementById('pizzaCanvas');
      const ctx = canvas.getContext('2d');
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 150;
      const titleRadius = 102;
      const descRadius = 200;
      const iconRadius = 130;
      const sliceCount = 7;
      const sliceAngle = (2 * Math.PI) / sliceCount;
      const centerRadius = 35; // Radius of center circle

      const iconURLs = [
        '/assets/gerp_theme/images/Growth.png',
        '/assets/gerp_theme/images/Ownership.png',
        '/assets/gerp_theme/images/Unity.png',
        '/assets/gerp_theme/images/Respect.png',
        '/assets/gerp_theme/images/Mentorship.png',
        '/assets/gerp_theme/images/Excellence.png',
        '/assets/gerp_theme/images/Transparency.png',
      ];

      const slices = [
        { title: 'Growth', desc: 'Committing to continuous improvement and progress, both for the organization and for the employees' },
        { title: 'Ownership', desc: 'Taking responsibility for actions, decision and outcomes, fostering a sense of accountability' },
        { title: 'Unity', desc: 'Promoting teamwork, collaboration and solidarity to achieve shared goals' },
        { title: 'Respect', desc: 'Value diversity, fostering an inclusive environment, and treating all individuals with dignity' },
        { title: 'Mentorship', desc: 'Encouraging personal and professional development through guidance and support for others.' },
        { title: 'Excellence', desc: 'Striving for the highest standards in products, services and performance.' },
        { title: 'Transparency', desc: 'Ensuring transparency in communication, decision making and operations, while safeguarding confidentiality' },
        
      ];

      let loadedIcons = [];
      let loadedCount = 0;
      let hoveredSlice = -1;
      let isAnimating = false;
      
      // Spinning animation variables
      let isSpinning = false;
      let spinRotation = 0;
      let spinSpeed = 0;
      let targetSpinSpeed = 0.007; // Rotation speed when spinning
      let spinAcceleration = 0.002;
      let isHoveringCenter = false;

      iconURLs.forEach((url, i) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          loadedIcons[i] = img;
          loadedCount++;
          if (loadedCount === sliceCount) drawAll();
        };
        img.onerror = () => {
          // Create a placeholder if image fails to load
          const placeholder = new Image();
          placeholder.src = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="white" stroke="#94581F" stroke-width="2"/></svg>');
          loadedIcons[i] = placeholder;
          loadedCount++;
          if (loadedCount === sliceCount) drawAll();
        };
        img.src = url;
      });

      // Mouse event handling
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);

      function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if hovering over center circle
        const dx = x - cx;
        const dy = y - cy;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        const wasHoveringCenter = isHoveringCenter;
        isHoveringCenter = distanceFromCenter <= centerRadius;

        // Start or stop spinning based on center hover
        if (isHoveringCenter && !wasHoveringCenter) {
          startSpinning();
        } else if (!isHoveringCenter && wasHoveringCenter) {
          stopSpinning();
        }

        // Handle slice hovering (only when not hovering center and not spinning)
        if (!isHoveringCenter && !isSpinning && spinSpeed === 0) {
          const newHoveredSlice = getSliceIndex(x, y);
          if (newHoveredSlice !== hoveredSlice) {
            hoveredSlice = newHoveredSlice;
            animateToHover();
          }
        } else {
          // Clear slice hover when hovering center or spinning
          if (hoveredSlice !== -1) {
            hoveredSlice = -1;
            animateToHover();
          }
        }
      }

      function handleMouseLeave() {
        isHoveringCenter = false;
        stopSpinning();
        if (hoveredSlice !== -1) {
          hoveredSlice = -1;
          animateToHover();
        }
      }

      function startSpinning() {
        if (!isSpinning) {
          isSpinning = true;
          animateSpin();
        }
      }

      function stopSpinning() {
        isSpinning = false;
        // Immediately stop rotation for better slice detection
        spinSpeed = 0;
      }

      function animateSpin() {
        if (isSpinning) {
          // Accelerate to target speed
          if (spinSpeed < targetSpinSpeed) {
            spinSpeed = Math.min(spinSpeed + spinAcceleration, targetSpinSpeed);
          }
          
          spinRotation += spinSpeed;
          if (spinRotation >= 2 * Math.PI) {
            spinRotation -= 2 * Math.PI;
          }

          drawAll();
          requestAnimationFrame(animateSpin);
        } else {
          // Stop immediately when not spinning
          drawAll();
        }
      }

      function getSliceIndex(x, y) {
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if mouse is within the pizza circle but not in center
        if (distance > radius || distance < centerRadius) return -1;

        // Calculate angle (accounting for current rotation only if not spinning)
        let angle = Math.atan2(dy, dx);
        if (spinSpeed === 0) {
          angle -= spinRotation;
        }
        
        // Properly normalize angle to be between 0 and 2π
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;

        // Determine which slice
        const sliceIndex = Math.floor(angle / sliceAngle);
        return (sliceIndex >= 0 && sliceIndex < sliceCount) ? sliceIndex : -1;
      }

      let currentOffsets = new Array(sliceCount).fill(0);
      const targetOffset = 10; // How much to pop out
      const animationSpeed = 0.15;

      function animateToHover() {
        if (isAnimating) return;
        isAnimating = true;

        function animate() {
          let stillAnimating = false;

          for (let i = 0; i < sliceCount; i++) {
            const target = i === hoveredSlice ? targetOffset : 0;
            const diff = target - currentOffsets[i];

            if (Math.abs(diff) > 0.1) {
              currentOffsets[i] += diff * animationSpeed;
              stillAnimating = true;
            } else {
              currentOffsets[i] = target;
            }
          }

          drawAll();

          if (stillAnimating) {
            requestAnimationFrame(animate);
          } else {
            isAnimating = false;
          }
        }

        animate();
      }

      function drawAll() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context for rotation
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spinRotation);
        ctx.translate(-cx, -cy);

        for (let i = 0; i < sliceCount; i++) {
          const start = i * sliceAngle;
          const end = start + sliceAngle;
          const mid = (start + end) / 2;
          const color = `#010B25`;
          const { title, desc } = slices[i];
          const icon = loadedIcons[i];

          // Calculate offset for each slice
          const offset = currentOffsets[i];
          const offsetX = offset * Math.cos(mid);
          const offsetY = offset * Math.sin(mid);

          const sliceCx = cx + offsetX;
          const sliceCy = cy + offsetY;

          // Draw slice with offset
          ctx.beginPath();
          ctx.moveTo(sliceCx, sliceCy);
          ctx.arc(sliceCx, sliceCy, radius, start, end);
          ctx.closePath();
          ctx.fillStyle = i === hoveredSlice ? '#010B25' : color; // Slightly brighter when hovered
          ctx.fill();

          // Add stroke to separate slices
          ctx.strokeStyle = '#FFCF01';
          ctx.lineWidth = 0.3;
          ctx.stroke();

          // White background for icon
          ctx.beginPath();
          ctx.strokeStyle = '#FFCF01';
          ctx.lineWidth = 25;
          ctx.arc(sliceCx, sliceCy, iconRadius, mid - sliceAngle * 0.5, mid + sliceAngle * 0.5);
          ctx.stroke();

          // Title
          drawCurvedTextNatural(ctx, title, sliceCx, sliceCy, titleRadius, mid, sliceAngle * 1, '#fff', 11);
        }

        // Restore context after rotation for icons (so they stay straight)
        ctx.restore();

        // Draw icons without rotation (so they remain straight)
        for (let i = 0; i < sliceCount; i++) {
          const start = i * sliceAngle;
          const end = start + sliceAngle;
          const mid = (start + end) / 2 + spinRotation; // Add spin rotation to position
          const icon = loadedIcons[i];

          // Calculate offset for each slice
          const offset = currentOffsets[i];
          const offsetX = offset * Math.cos(mid);
          const offsetY = offset * Math.sin(mid);

          const sliceCx = cx + offsetX;
          const sliceCy = cy + offsetY;

          // Icon (drawn without rotation context, so it stays straight)
          if (icon) {
            const iconX = sliceCx + iconRadius * Math.cos(mid) - 9;
            const iconY = sliceCy + iconRadius * Math.sin(mid) - 9;
            ctx.drawImage(icon, iconX, iconY, 18, 18);
          }
        }

        // Draw center circle with white background and "GOURMET" text (not rotated)
        ctx.beginPath();
        ctx.arc(cx, cy, centerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isHoveringCenter ? '#f0f0f0' : '#fff'; // Slightly different color when hovering
        ctx.fill();
        ctx.strokeStyle = '#010B25';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw "GOURMET" text in center
        ctx.fillStyle = '#010B25';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GOURMET', cx, cy);
      }

      function drawCurvedTextNatural(ctx, text, cx, cy, r, midAngle, maxAngle, color = '#000', fontSize = 14) {
        ctx.save();
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';

        const anglePerPixel = 1.2 / r;
        const textWidth = ctx.measureText(text).width;
        const textAngle = Math.min(textWidth * anglePerPixel, maxAngle);

        let currentAngle = midAngle - textAngle / 2;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const charWidth = ctx.measureText(char).width;
          const charAngle = charWidth * anglePerPixel;

          const x = cx + r * Math.cos(currentAngle + charAngle / 2);
          const y = cy + r * Math.sin(currentAngle + charAngle / 2);

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(currentAngle + charAngle / 2 + Math.PI / 2);
          ctx.fillText(char, 0, 0);
          ctx.restore();

          currentAngle += charAngle;
        }

        ctx.restore();
      }

      function wrapCurvedLines(ctx, text, radius, maxAngle, fontSize) {
        const words = text.split(' ');
        const lines = [];
        let line = '';

        ctx.font = `${fontSize}px sans-serif`;
        
        // Improved calculation for curved text wrapping
        const arcLength = radius * maxAngle;
        const avgCharWidth = ctx.measureText('M').width; // Use average character width
        const maxCharsPerLine = Math.floor(arcLength / avgCharWidth * 1.2); // More generous character limit
        const maxLines = 7; // Allow up to 3 lines

        for (let i = 0; i < words.length; i++) {
          const testLine = line + (line ? ' ' : '') + words[i];
          
          // Check both character count and pixel width
          if (testLine.length <= maxCharsPerLine && lines.length < maxLines) {
            line = testLine;
          } else {
            if (line) {
              lines.push(line);
              line = words[i];
            } else {
              // If single word is too long, try to break it
              if (words[i].length > maxCharsPerLine) {
                const chunks = breakLongWord(words[i], maxCharsPerLine);
                lines.push(chunks[0]);
                if (chunks.length > 1 && lines.length < maxLines) {
                  line = chunks.slice(1).join('');
                }
              } else {
                line = words[i];
              }
            }
          }
        }
        
        if (line && lines.length < maxLines) {
          lines.push(line);
        }
        
        return lines.slice(0, maxLines); // Ensure we don't exceed max lines
      }

      function breakLongWord(word, maxLength) {
        const chunks = [];
        for (let i = 0; i < word.length; i += maxLength) {
          chunks.push(word.slice(i, i + maxLength));
        }
        return chunks;
      }