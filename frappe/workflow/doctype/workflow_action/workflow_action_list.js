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
						
						data += '<div class="row visible-section" style="border-bottom: 1px solid rgb(209, 216, 221);border-top: 1px solid rgb(209, 216, 221);padding: 1px 15px;  position:relative; margin-top: 5px; margin-left:0px; margin-right:0px">'	
						data += '<p style="margin:0px;border-bottom:1px solid;"><a class="section-head collapsed h6 uppercase" style="display:block;margin:0px;background-color: transparent;text-align: left;padding: 15px;color:#000;padding-right: 0;" data-toggle="collapse" href="#multiCollapseExample1">Open Purchase Order Wise Total Amount</a><span class="octicon collapse-indicator octicon-chevron-down" style="position:absolute;right:15px;top:15px;"></span></p>'
						data += '<div class="collapse" id="multiCollapseExample1">'
						data += '<div class="card card-body" >'

						$.each(r.message, function( index, value ) {
							data += '<div class="inner-row col-lg-2 col-md-4 col-sm-6 text-center border-right" style="margin-bottom:20px;"><div style="width:60px;font-weight:bold;display: inline-block;">'+value.company+' </div>' + '</br><span class="total"> '+value.total+'</span></div>' 
							// console.log( index + ": " + value.company );
						  });

						data += '</div">'
						data += '</div>'  
						data += '</div>'
						data += '</div>'

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