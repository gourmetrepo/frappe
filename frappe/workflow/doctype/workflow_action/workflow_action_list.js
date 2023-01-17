frappe.listview_settings['Workflow Action'] = {
	onload: function(me) {
		if (Object.values(frappe.route_options).length == 0){
			frappe.route_options = {
				"reference_doctype":["in",['Payment Order,Employee,Purchase Order,Expense Entry,Customer,Supplier,Item Daily Rate,Payment Entry,Journal Entry,Payment Advice,BOM']],
				"user": frappe.session.user_email,
				//"user": 'zubair@gourmetpakistan.com',
				"status": "Open",
				"creation":["Between",[frappe.datetime.add_days(frappe.datetime.get_today(), -10),frappe.datetime.get_today()]]
			};

			frappe.call({
				method: 'nrp_manufacturing.apis.purchase_order.po_total',
				args: {
					'doc': frappe.route_options
				},
				callback: function(r) {
					if (!r.exc) {
						if (r.message.length > 0){
							var data =""
						data += '<div style="padding:10px 20px;">'
						$.each(r.message, function( index, value ) {
							data += '<div class="inner-row"><div style="width:60px;font-weight:bold;display: inline-block;">'+value.company+' </div>' + '<span class="total"> '+value.total+'</span></div>' 
							// console.log( index + ": " + value.company );
						  });
						data += '</div">'
						$(data).insertBefore(".page-form");
						}
					}
				}
			});
		}
	},
	get_form_link: (doc) => {
		let doctype = '';
		let docname = '';
		if(doc.status === 'Open') {
			doctype = doc.reference_doctype;
			docname = doc.reference_name;
		} else {
			doctype = 'Workflow Action';
			docname = doc.name;
		}
		docname = docname.match(/[%'"]/)
			? encodeURIComponent(docname)
			: docname;

		const link = '#Form/' + doctype + '/' + docname;
		return link;
	}
};