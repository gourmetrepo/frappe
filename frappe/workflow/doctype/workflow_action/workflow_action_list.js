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