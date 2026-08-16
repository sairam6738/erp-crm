import { useEffect, useState } from "react";
import api from "./api";

type User = { id:number; name:string; email:string; role:string };

function Login({ onLogin }: { onLogin:(u:User)=>void }) {
  const [email,setEmail] = useState("admin@example.com");
  const [password,setPassword] = useState("Password123");
  const [error,setError] = useState("");

  async function submit(e:React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api.post("/auth/login",{email,password});
      localStorage.setItem("token",r.data.token);
      localStorage.setItem("user",JSON.stringify(r.data.user));
      onLogin(r.data.user);
    } catch (e:any) {
      setError(e.response?.data?.message || "Login failed");
    }
  }

  return <div className="login">
    <form className="card login-card" onSubmit={submit}>
      <h1>Mini ERP + CRM</h1>
      <p className="muted">Operations Portal</p>
      <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      {error && <div className="error">{error}</div>}
      <button>Sign in</button>
      <small>Demo: admin@example.com / Password123</small>
    </form>
  </div>
}

function App() {
  const [user,setUser] = useState<User|null>(() => {
    const raw = localStorage.getItem("user"); return raw ? JSON.parse(raw) : null;
  });
  const [page,setPage] = useState("Dashboard");

  if (!user) return <Login onLogin={setUser}/>;

  const logout = () => {
    localStorage.clear(); setUser(null);
  };

  return <div className="app">
    <aside>
      <h2>ERP Portal</h2>
      <div className="user">{user.name}<br/><span>{user.role}</span></div>
      {["Dashboard","Customers","Products","Challans"].map(x =>
        <button className={page===x?"nav active":"nav"} onClick={()=>setPage(x)} key={x}>{x}</button>
      )}
      <button className="nav logout" onClick={logout}>Logout</button>
    </aside>
    <main>
      <header><h1>{page}</h1><span>{user.email}</span></header>
      {page==="Dashboard" && <Dashboard/>}
      {page==="Customers" && <Customers/>}
      {page==="Products" && <Products/>}
      {page==="Challans" && <Challans/>}
    </main>
  </div>
}

function Dashboard() {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    challans: 0,
    lowStock: 0,
    pendingChallans: 0,
    totalStock: 0
  });

  useEffect(() => {
    (async () => {
      try {
        const [c, p, ch] = await Promise.all([
          api.get("/customers?limit=1"),
          api.get("/products"),
          api.get("/challans")
        ]);

        const products =
          p.data?.data || p.data || [];

        const challans =
          ch.data?.data || ch.data || [];

        const lowStock =
          products.filter(
            (product: any) =>
              Number(product.current_stock) <=
              Number(product.minimum_stock)
          ).length;

        const totalStock =
          products.reduce(
            (total: number, product: any) =>
              total +
              Number(product.current_stock || 0),
            0
          );

        const pendingChallans =
          challans.filter(
            (challan: any) =>
              String(challan.status).toLowerCase() ===
              "draft"
          ).length;

        setStats({
          customers:
            Number(c.data?.total || 0),

          products:
            products.length,

          challans:
            challans.length,

          lowStock,

          pendingChallans,

          totalStock
        });

      } catch (e: any) {

        console.error(
          "Dashboard loading error:",
          e.response?.data || e
        );

      }
    })();
  }, []);

  return (
    <div className="grid">

      <Stat
        title="Customers"
        value={stats.customers}
      />

      <Stat
        title="Products"
        value={stats.products}
      />

      <Stat
        title="Challans"
        value={stats.challans}
      />

      <Stat
        title="Low Stock"
        value={stats.lowStock}
      />

      <Stat
        title="Pending Challans"
        value={stats.pendingChallans}
      />

      <Stat
        title="Total Stock"
        value={stats.totalStock}
      />

      <div className="card wide">

        <h3>
          Business Flow
        </h3>

        <p>
          Customer → Product/Stock →
          Sales Challan → Stock Reduction
        </p>

      </div>

    </div>
  );
}
function Stat({title,value}:{title:string,value:number}) {
  return <div className="card stat"><span>{title}</span><strong>{value}</strong></div>
}

function Customers() {
  const [data, setData] = useState<any[]>([]);

  const [search, setSearch] = useState("");

  // Follow-up date filter
  const [followUpFilter, setFollowUpFilter] =
    useState("");

  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] =
    useState(false);

  // Edit mode
  const [editing, setEditing] =
    useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<any>(null);

  const emptyForm = {
    name: "",
    mobile: "",
    email: "",
    business_name: "",
    gst_number: "",
    customer_type: "Wholesale",
    address: "",
    status: "Active",
    follow_up_date: "",
    notes: ""
  };

  const [form, setForm] =
    useState<any>(emptyForm);


  /*
   * Convert database date into
   * HTML date input format.
   *
   * Example:
   * 2027-12-11T18:30:00.000Z
   *
   * becomes:
   * 2027-12-11
   */
  const formatDateForInput = (
    date: any
  ) => {
    if (!date) return "";

    return String(date).substring(0, 10);
  };


  /*
   * LOAD CUSTOMERS
   */
  const load = async () => {
    try {

      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.append(
          "search",
          search.trim()
        );
      }

      if (followUpFilter) {
        params.append(
          "follow_up_date",
          followUpFilter
        );
      }

      const url =
        params.toString()
          ? `/customers?${params.toString()}`
          : "/customers";

      const response =
        await api.get(url);

      setData(
        response.data?.data || []
      );

    } catch (e: any) {

      console.error(
        "Customer loading error:",
        e.response?.data || e
      );

      alert(
        e.response?.data?.message ||
        "Unable to load customers"
      );
    }
  };


  /*
   * Reload when:
   * - Search changes
   * - Follow-up date changes
   */
  useEffect(() => {
    load();
  }, [
    search,
    followUpFilter
  ]);


  /*
   * OPEN ADD CUSTOMER
   */
  const openAdd = () => {

    setEditing(false);

    setSelectedCustomer(null);

    setForm({
      ...emptyForm
    });

    setShow(true);
  };


  /*
   * OPEN EDIT CUSTOMER
   */
  const openEdit = (
    customer: any
  ) => {

    setEditing(true);

    setSelectedCustomer(
      customer
    );

    setForm({
      name:
        customer.name || "",

      mobile:
        customer.mobile || "",

      email:
        customer.email || "",

      business_name:
        customer.business_name || "",

      gst_number:
        customer.gst_number || "",

      customer_type:
        customer.customer_type ||
        "Wholesale",

      address:
        customer.address || "",

      status:
        customer.status ||
        "Active",

      follow_up_date:
        formatDateForInput(
          customer.follow_up_date
        ),

      notes:
        customer.notes || ""
    });

    setShow(true);
  };


  /*
   * SAVE CUSTOMER
   *
   * POST = Add
   * PUT  = Edit
   */
  const save = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    try {

      if (
        editing &&
        selectedCustomer
      ) {

        await api.put(
          `/customers/${selectedCustomer.id}`,
          form
        );

        alert(
          "Customer updated successfully."
        );

      } else {

        await api.post(
          "/customers",
          form
        );

        alert(
          "Customer added successfully."
        );
      }

      setShow(false);

      setEditing(false);

      setSelectedCustomer(null);

      setForm({
        ...emptyForm
      });

      await load();

    } catch (e: any) {

      console.error(
        "Customer save error:",
        e.response?.data || e
      );

      alert(
        e.response?.data?.message ||
        "Unable to save customer"
      );
    }
  };


  /*
   * VIEW CUSTOMER DETAILS
   */
  const viewCustomer = (
    customer: any
  ) => {

    setSelectedCustomer(
      customer
    );

    setShowDetails(true);
  };


  /*
   * CLEAR DATE FILTER
   */
  const clearFollowUpFilter = () => {

    setFollowUpFilter("");
  };


  return (
    <section>

      {/* =========================
          SEARCH + FILTER TOOLBAR
         ========================= */}

      <div className="toolbar">

        <input
          placeholder="Search customers..."
          value={search}
          onChange={e =>
            setSearch(
              e.target.value
            )
          }
        />

        <input
          type="date"
          value={followUpFilter}
          onChange={e =>
            setFollowUpFilter(
              e.target.value
            )
          }
        />

        {followUpFilter && (

          <button
            type="button"
            onClick={
              clearFollowUpFilter
            }
          >
            Clear Date
          </button>

        )}

        <button
          type="button"
          onClick={openAdd}
        >
          + Add Customer
        </button>

      </div>


      {/* =========================
          CUSTOMER TABLE
         ========================= */}

      <div className="card table-wrap">

        <table>

          <thead>

            <tr>

              <th>Name</th>

              <th>Business</th>

              <th>Mobile</th>

              <th>Type</th>

              <th>Status</th>

              <th>Follow-up</th>

              <th>Action</th>

            </tr>

          </thead>


          <tbody>

            {data.length === 0 ? (

              <tr>

                <td colSpan={7}>
                  No customers found.
                </td>

              </tr>

            ) : (

              data.map(
                (customer: any) => (

                  <tr
                    key={customer.id}
                  >

                    <td>
                      {customer.name}
                    </td>

                    <td>
                      {
                        customer.business_name
                      }
                    </td>

                    <td>
                      {customer.mobile}
                    </td>

                    <td>
                      {
                        customer.customer_type
                      }
                    </td>

                    <td>
                      {customer.status}
                    </td>

                    <td>

                      {customer.follow_up_date
                        ? formatDateForInput(
                            customer.follow_up_date
                          )
                        : "-"}

                    </td>

                    <td>

                      <button
                        type="button"
                        onClick={() =>
                          viewCustomer(
                            customer
                          )
                        }
                      >
                        View
                      </button>

                      {" "}

                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            customer
                          )
                        }
                      >
                        Edit
                      </button>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>


      {/* =========================
          ADD / EDIT CUSTOMER MODAL
         ========================= */}

      {show && (

        <Modal
          title={
            editing
              ? "Edit Customer"
              : "Add Customer"
          }
          onClose={() => {

            setShow(false);

            setEditing(false);

            setSelectedCustomer(
              null
            );

          }}
        >

          <form
            onSubmit={save}
            className="form-grid"
          >

            {/* NAME */}

            <label>

              Name

              <input
                value={form.name}
                onChange={e =>
                  setForm({
                    ...form,
                    name:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* MOBILE */}

            <label>

              Mobile

              <input
                value={form.mobile}
                onChange={e =>
                  setForm({
                    ...form,
                    mobile:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* EMAIL */}

            <label>

              Email

              <input
                type="email"
                value={form.email}
                onChange={e =>
                  setForm({
                    ...form,
                    email:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* BUSINESS */}

            <label>

              Business Name

              <input
                value={
                  form.business_name
                }
                onChange={e =>
                  setForm({
                    ...form,
                    business_name:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* GST */}

            <label>

              GST Number

              <input
                value={
                  form.gst_number
                }
                onChange={e =>
                  setForm({
                    ...form,
                    gst_number:
                      e.target.value
                  })
                }
              />

            </label>


            {/* CUSTOMER TYPE */}

            <label>

              Customer Type

              <select
                value={
                  form.customer_type
                }
                onChange={e =>
                  setForm({
                    ...form,
                    customer_type:
                      e.target.value
                  })
                }
              >

                <option value="Retail">
                  Retail
                </option>

                <option value="Wholesale">
                  Wholesale
                </option>

                <option value="Distributor">
                  Distributor
                </option>

              </select>

            </label>


            {/* ADDRESS */}

            <label>

              Address

              <input
                value={
                  form.address
                }
                onChange={e =>
                  setForm({
                    ...form,
                    address:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* STATUS */}

            <label>

              Status

              <select
                value={form.status}
                onChange={e =>
                  setForm({
                    ...form,
                    status:
                      e.target.value
                  })
                }
              >

                <option value="Lead">
                  Lead
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

              </select>

            </label>


            {/* FOLLOW-UP DATE */}

            <label>

              Follow-up Date

              <input
                type="date"
                value={
                  form.follow_up_date
                }
                onChange={e =>
                  setForm({
                    ...form,
                    follow_up_date:
                      e.target.value
                  })
                }
              />

            </label>


            {/* NOTES */}

            <label
              className="full-width"
            >

              Follow-up Notes

              <textarea
                rows={4}
                value={
                  form.notes
                }
                onChange={e =>
                  setForm({
                    ...form,
                    notes:
                      e.target.value
                  })
                }
                placeholder="Enter follow-up notes..."
              />

            </label>


            {/* SAVE BUTTON */}

            <button type="submit">

              {editing
                ? "Update Customer"
                : "Save Customer"}

            </button>

          </form>

        </Modal>

      )}


      {/* =========================
          CUSTOMER DETAILS
         ========================= */}

      {showDetails &&
        selectedCustomer && (

          <Modal
            title={
              `Customer Details - ` +
              selectedCustomer.name
            }
            onClose={() =>
              setShowDetails(false)
            }
          >

            <div
              className="customer-details"
            >

              <div>

                <strong>
                  Name
                </strong>

                <span>
                  {
                    selectedCustomer.name ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  Mobile
                </strong>

                <span>
                  {
                    selectedCustomer.mobile ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  Email
                </strong>

                <span>
                  {
                    selectedCustomer.email ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  Business
                </strong>

                <span>
                  {
                    selectedCustomer.business_name ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  GST Number
                </strong>

                <span>
                  {
                    selectedCustomer.gst_number ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  Customer Type
                </strong>

                <span>
                  {
                    selectedCustomer.customer_type ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  Address
                </strong>

                <span>
                  {
                    selectedCustomer.address ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  Status
                </strong>

                <span>
                  {
                    selectedCustomer.status ||
                    "-"
                  }
                </span>

              </div>


              <div>

                <strong>
                  Follow-up Date
                </strong>

                <span>

                  {selectedCustomer.follow_up_date
                    ? formatDateForInput(
                        selectedCustomer.follow_up_date
                      )
                    : "No follow-up date"}

                </span>

              </div>


              <div
                className="customer-notes"
              >

                <strong>
                  Follow-up Notes
                </strong>

                <p>

                  {
                    selectedCustomer.notes ||
                    "No notes added."
                  }

                </p>

              </div>

            </div>

          </Modal>

        )}

    </section>
  );
}

function Products() {
  const [data, setData] = useState<any[]>([]);

  // Add/Edit modal
  const [show, setShow] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);

  // Product being edited
  const [selectedProduct, setSelectedProduct] =
    useState<any>(null);

  // Stock history
  const [movements, setMovements] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Product form
  const [form, setForm] = useState<any>({
    name: "",
    sku: "",
    category: "",
    unit_price: 0,
    current_stock: 0,
    minimum_stock: 5,
    warehouse: "WH-01"
  });


  /*
   * ==========================================
   * LOAD PRODUCTS
   * ==========================================
   */

  const load = async () => {
    try {
      const response = await api.get("/products");

      setData(response.data || []);

    } catch (e: any) {
      console.error(
        "Products loading error:",
        e.response?.data || e
      );

      alert(
        e.response?.data?.message ||
        "Unable to load products"
      );
    }
  };


  /*
   * ==========================================
   * LOAD PRODUCTS WHEN PAGE OPENS
   * ==========================================
   */

  useEffect(() => {
    load();
  }, []);


  /*
   * ==========================================
   * OPEN ADD PRODUCT
   * ==========================================
   */

  const openAdd = () => {
    setEditing(false);

    setSelectedProduct(null);

    setForm({
      name: "",
      sku: "",
      category: "",
      unit_price: 0,
      current_stock: 0,
      minimum_stock: 5,
      warehouse: "WH-01"
    });

    setShow(true);
  };


  /*
   * ==========================================
   * OPEN EDIT PRODUCT
   * ==========================================
   */

  const openEdit = (product: any) => {
    setEditing(true);

    setSelectedProduct(product);

    setForm({
      name: product.name || "",

      sku: product.sku || "",

      category: product.category || "",

      unit_price:
        Number(product.unit_price || 0),

      current_stock:
        Number(product.current_stock || 0),

      minimum_stock:
        Number(product.minimum_stock || 0),

      warehouse:
        product.warehouse || ""
    });

    setShow(true);
  };


  /*
   * ==========================================
   * SAVE / UPDATE PRODUCT
   * ==========================================
   */

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {

      /*
       * Convert number fields
       * from strings to numbers.
       */

      const productData = {
        name: String(form.name).trim(),

        sku: String(form.sku).trim(),

        category:
          String(form.category).trim(),

        unit_price:
          Number(form.unit_price),

        current_stock:
          Number(form.current_stock),

        minimum_stock:
          Number(form.minimum_stock),

        warehouse:
          String(form.warehouse).trim()
      };


      /*
       * BASIC FRONTEND VALIDATION
       */

      if (!productData.name) {
        alert("Product name is required.");
        return;
      }

      if (!productData.sku) {
        alert("SKU is required.");
        return;
      }

      if (!productData.category) {
        alert("Category is required.");
        return;
      }

      if (
        productData.unit_price < 0
      ) {
        alert(
          "Unit price cannot be negative."
        );
        return;
      }

      if (
        productData.current_stock < 0
      ) {
        alert(
          "Current stock cannot be negative."
        );
        return;
      }

      if (
        productData.minimum_stock < 0
      ) {
        alert(
          "Minimum stock cannot be negative."
        );
        return;
      }

      if (!productData.warehouse) {
        alert("Warehouse is required.");
        return;
      }


      /*
       * ======================================
       * EDIT EXISTING PRODUCT
       * ======================================
       */

      if (
        editing &&
        selectedProduct
      ) {

        await api.put(
          `/products/${selectedProduct.id}`,
          productData
        );

        alert(
          "Product updated successfully."
        );

      }


      /*
       * ======================================
       * ADD NEW PRODUCT
       * ======================================
       */

      else {

        await api.post(
          "/products",
          productData
        );

        alert(
          "Product added successfully."
        );
      }


      /*
       * CLOSE MODAL
       */

      setShow(false);

      setEditing(false);

      setSelectedProduct(null);


      /*
       * RESET FORM
       */

      setForm({
        name: "",
        sku: "",
        category: "",
        unit_price: 0,
        current_stock: 0,
        minimum_stock: 5,
        warehouse: "WH-01"
      });


      /*
       * RELOAD PRODUCTS
       */

      await load();

    } catch (e: any) {

      console.error(
        "Product save error:",
        e.response?.data || e
      );

      alert(
        e.response?.data?.message ||
        "Unable to save product"
      );
    }
  };


  /*
   * ==========================================
   * OPEN STOCK HISTORY
   * ==========================================
   */

  const openHistory = async (
    product: any
  ) => {

    try {

      const response =
        await api.get(
          "/products/movements/all"
        );

      setMovements(
        response.data || []
      );

      setSelectedProduct(
        product
      );

      setShowHistory(true);

    } catch (e: any) {

      console.error(
        "Stock history error:",
        e.response?.data || e
      );

      alert(
        e.response?.data?.message ||
        "Unable to load stock movements"
      );
    }
  };


  /*
   * ==========================================
   * FILTER MOVEMENTS FOR SELECTED PRODUCT
   * ==========================================
   */

  const productMovements =
    movements.filter(
      (movement: any) => {

        const movementProductId =
          movement.product_id ??
          movement.productId;

        return (
          Number(movementProductId) ===
          Number(selectedProduct?.id)
        );
      }
    );


  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <section>


      {/* ======================================
          HEADER
         ====================================== */}

      <div className="toolbar">

        <span>
          {data.length} products
        </span>


        <button
          type="button"
          onClick={openAdd}
        >
          + Add Product
        </button>

      </div>


      {/* ======================================
          PRODUCTS TABLE
         ====================================== */}

      <div className="card table-wrap">

        <table>

          <thead>

            <tr>

              <th>
                Product
              </th>

              <th>
                SKU
              </th>

              <th>
                Category
              </th>

              <th>
                Price
              </th>

              <th>
                Stock
              </th>

              <th>
                Alert
              </th>

              <th>
                Action
              </th>

            </tr>

          </thead>


          <tbody>

            {data.length === 0 ? (

              <tr>

                <td colSpan={7}>
                  No products found.
                </td>

              </tr>

            ) : (

              data.map(
                (x: any) => (

                  <tr
                    key={x.id}
                  >


                    {/* PRODUCT */}

                    <td>
                      {x.name}
                    </td>


                    {/* SKU */}

                    <td>
                      {x.sku}
                    </td>


                    {/* CATEGORY */}

                    <td>
                      {x.category}
                    </td>


                    {/* PRICE */}

                    <td>
                      ₹
                      {Number(
                        x.unit_price
                      ).toLocaleString()}
                    </td>


                    {/* STOCK */}

                    <td
                      className={
                        Number(
                          x.current_stock
                        ) <=
                        Number(
                          x.minimum_stock
                        )
                          ? "low"
                          : ""
                      }
                    >
                      {x.current_stock}
                    </td>


                    {/* MINIMUM STOCK */}

                    <td>
                      {x.minimum_stock}
                    </td>


                    {/* ACTIONS */}

                    <td>

                      <button
                        type="button"
                        onClick={() =>
                          openHistory(x)
                        }
                      >
                        History
                      </button>


                      {" "}


                      <button
                        type="button"
                        onClick={() =>
                          openEdit(x)
                        }
                      >
                        Edit
                      </button>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>


      {/* ======================================
          ADD / EDIT PRODUCT MODAL
         ====================================== */}

      {show && (

        <Modal
          title={
            editing
              ? "Edit Product"
              : "Add Product"
          }

          onClose={() => {

            setShow(false);

            setEditing(false);

            setSelectedProduct(null);

          }}
        >

          <form
            onSubmit={save}
            className="form-grid"
          >


            {/* PRODUCT NAME */}

            <label>

              Product Name

              <input
                value={form.name}
                onChange={e =>
                  setForm({
                    ...form,
                    name:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* SKU */}

            <label>

              SKU

              <input
                value={form.sku}
                onChange={e =>
                  setForm({
                    ...form,
                    sku:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* CATEGORY */}

            <label>

              Category

              <input
                value={
                  form.category
                }
                onChange={e =>
                  setForm({
                    ...form,
                    category:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* UNIT PRICE */}

            <label>

              Unit Price

              <input
                type="number"
                min="0"
                value={
                  form.unit_price
                }
                onChange={e =>
                  setForm({
                    ...form,
                    unit_price:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* CURRENT STOCK */}

            <label>

              Current Stock

              <input
                type="number"
                min="0"
                step="1"
                value={
                  form.current_stock
                }
                onChange={e =>
                  setForm({
                    ...form,
                    current_stock:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* MINIMUM STOCK */}

            <label>

              Minimum Stock

              <input
                type="number"
                min="0"
                step="1"
                value={
                  form.minimum_stock
                }
                onChange={e =>
                  setForm({
                    ...form,
                    minimum_stock:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* WAREHOUSE */}

            <label>

              Warehouse

              <input
                value={
                  form.warehouse
                }
                onChange={e =>
                  setForm({
                    ...form,
                    warehouse:
                      e.target.value
                  })
                }
                required
              />

            </label>


            {/* SUBMIT BUTTON */}

            <button
              type="submit"
            >

              {editing
                ? "Update Product"
                : "Save Product"}

            </button>

          </form>

        </Modal>

      )}


      {/* ======================================
          STOCK HISTORY MODAL
         ====================================== */}

      {showHistory &&
        selectedProduct && (

          <Modal
            title={
              `Stock History - ` +
              `${selectedProduct.name}`
            }

            onClose={() => {
              setShowHistory(false);
              setSelectedProduct(null);
            }}
          >

            <div
              className="stock-summary"
            >

              <strong>
                Current Stock:
              </strong>


              <span
                className={
                  Number(
                    selectedProduct.current_stock
                  ) <=
                  Number(
                    selectedProduct.minimum_stock
                  )
                    ? "low"
                    : ""
                }
              >
                {
                  selectedProduct.current_stock
                }
              </span>

            </div>


            {productMovements.length === 0 ? (

              <div
                className="empty-products"
              >
                No stock movements found
                for this product.
              </div>

            ) : (

              <div
                className="table-wrap"
              >

                <table>

                  <thead>

                    <tr>

                      <th>
                        Type
                      </th>

                      <th>
                        Quantity
                      </th>

                      <th>
                        Reason
                      </th>

                      <th>
                        Created By
                      </th>

                      <th>
                        Timestamp
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {productMovements.map(
                      (
                        movement: any,
                        index
                      ) => {

                        const type =
                          movement.movement_type ??
                          movement.type;

                        const quantity =
                          movement.quantity ??
                          movement.quantity_changed ??
                          movement.qty;

                        const reason =
                          movement.reason ??
                          movement.reference ??
                          "-";

                        const createdBy =
                          movement.created_by_name ??
                          movement.created_by ??
                          "-";

                        const timestamp =
                          movement.created_at ??
                          movement.timestamp;


                        return (

                          <tr
                            key={
                              movement.id ??
                              index
                            }
                          >

                            <td>

                              <strong
                                className={
                                  type === "IN"
                                    ? "movement-in"
                                    : "movement-out"
                                }
                              >
                                {type}
                              </strong>

                            </td>


                            <td>
                              {quantity}
                            </td>


                            <td>
                              {reason}
                            </td>


                            <td>
                              {createdBy}
                            </td>


                            <td>

                              {timestamp
                                ? new Date(
                                    timestamp
                                  ).toLocaleString()
                                : "-"}

                            </td>

                          </tr>

                        );

                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </Modal>

        )}

    </section>
  );
}

function Challans() {
  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<
    { product_id: number; quantity: number }[]
  >([]);

  const [error, setError] = useState("");

  // Load challans, customers and products
  const load = async () => {
    try {
      const [challanResponse, customerResponse, productResponse] =
        await Promise.all([
          api.get("/challans"),
          api.get("/customers?limit=100"),
          api.get("/products")
        ]);

      setData(challanResponse.data);

      // Handles either array or { data: [...] }
      setCustomers(
        customerResponse.data?.data ?? customerResponse.data
      );

      setProducts(
        productResponse.data?.data ?? productResponse.data
      );
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          "Unable to load challan information"
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Add first available product
  const addProduct = () => {
    if (products.length === 0) {
      setError("No products available.");
      return;
    }

    const firstProduct = products[0];

    setItems([
      ...items,
      {
        product_id: Number(firstProduct.id),
        quantity: 1
      }
    ]);

    setError("");
  };

  // Change selected product
  const changeProduct = (
    index: number,
    productId: number
  ) => {
    const updated = [...items];

    updated[index].product_id = productId;

    setItems(updated);
  };

  // Change quantity
  const changeQuantity = (
    index: number,
    quantity: number
  ) => {
    const updated = [...items];

    updated[index].quantity =
      quantity < 1 ? 1 : quantity;

    setItems(updated);
  };

  // Remove product
  const removeProduct = (index: number) => {
    setItems(
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // Create Draft Challan
  const createChallan = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one product.");
      return;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        setError("Quantity must be greater than 0.");
        return;
      }
    }

    try {
      await api.post("/challans", {
        customer_id: Number(customerId),
        items: items
      });

      alert("Draft challan created successfully.");

      setShowForm(false);
      setCustomerId("");
      setItems([]);

      await load();
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          "Unable to create challan."
      );
    }
  };

  // Confirm Draft Challan
  const confirmChallan = async (id: number) => {
    try {
      await api.put(`/challans/${id}/confirm`);

      alert(
        "Challan confirmed and stock reduced."
      );

      await load();
    } catch (e: any) {
      alert(
        e.response?.data?.message ||
          "Unable to confirm challan."
      );
    }
  };

  return (
    <section>

      {/* HEADER */}
      <div className="toolbar">
        <h2>Sales Challans</h2>

        <button
          onClick={() => {
            setShowForm(true);
            setError("");
          }}
        >
          + Create Challan
        </button>
      </div>

      {/* ERROR */}
      {error && !showForm && (
        <div className="error">
          {error}
        </div>
      )}

      {/* CHALLAN TABLE */}
      <div className="card table-wrap">

        <table>

          <thead>
            <tr>
              <th>Challan</th>
              <th>Customer</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (

              <tr>
                <td colSpan={5}>
                  No challans found.
                </td>
              </tr>

            ) : (

              data.map(x => (

                <tr key={x.id}>

                  <td>
                    {x.challan_number}
                  </td>

                  <td>
                    {x.customer_name}
                  </td>

                  <td>
                    {x.total_quantity}
                  </td>

                  <td>
                    <strong>
                      {x.status}
                    </strong>
                  </td>

                  <td>

                    {x.status === "Draft" && (

                      <button
                        onClick={() =>
                          confirmChallan(x.id)
                        }
                      >
                        Confirm
                      </button>

                    )}

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* CREATE CHALLAN FORM */}
      {showForm && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>
                Create Sales Challan
              </h2>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={createChallan}
              className="challan-form"
            >

              {/* CUSTOMER */}
              <label>
                Customer

                <select
                  value={customerId}
                  onChange={e =>
                    setCustomerId(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Select Customer
                  </option>

                  {customers.map(customer => (

                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                      {customer.business_name
                        ? ` - ${customer.business_name}`
                        : ""}
                    </option>

                  ))}

                </select>

              </label>

              {/* PRODUCTS HEADER */}
              <div className="products-header">

                <h3>
                  Products
                </h3>

                <button
                  type="button"
                  onClick={addProduct}
                >
                  + Add Product
                </button>

              </div>

              {/* PRODUCT ROWS */}
              {items.map((item, index) => {

                const selectedProduct =
                  products.find(
                    product =>
                      Number(product.id) ===
                      Number(item.product_id)
                  );

                return (

                  <div
                    className="challan-product-row"
                    key={index}
                  >

                    {/* PRODUCT */}
                    <select
                      value={item.product_id}
                      onChange={e =>
                        changeProduct(
                          index,
                          Number(e.target.value)
                        )
                      }
                    >

                      {products.map(product => (

                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.name}
                          {product.sku
                            ? ` (${product.sku})`
                            : ""}
                        </option>

                      ))}

                    </select>

                    {/* QUANTITY */}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e =>
                        changeQuantity(
                          index,
                          Number(e.target.value)
                        )
                      }
                    />

                    {/* STOCK */}
                    <span>
                      Stock:{" "}
                      {selectedProduct?.current_stock ??
                        0}
                    </span>

                    {/* REMOVE */}
                    <button
                      type="button"
                      onClick={() =>
                        removeProduct(index)
                      }
                    >
                      Remove
                    </button>

                  </div>

                );

              })}

              {/* EMPTY PRODUCTS */}
              {items.length === 0 && (

                <div className="empty-products">

                  No products added.

                  <br />

                  Click
                  <strong>
                    {" + Add Product "}
                  </strong>
                  to add a product.

                </div>

              )}

              {/* FORM ERROR */}
              {error && (

                <div className="error">
                  {error}
                </div>

              )}

              {/* BUTTONS */}
              <div className="form-actions">

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !customerId ||
                    items.length === 0
                  }
                >
                  Create Draft Challan
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </section>
  );
}

function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:any}) {
  return <div className="overlay"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>
}

export default App;
