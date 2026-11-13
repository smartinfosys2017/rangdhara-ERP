'use client';

import { useMemo, useState } from 'react';

import {
  Copy,
  Ellipsis,
  Plus,
  Search,
  X,
} from 'lucide-react';

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
} from '@/components/ui/card';

import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Input } from '@/components/ui/input';

import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area';

import { Skeleton } from '@/components/ui/skeleton';

import { can } from '@/lib/permissions';

import ItemsAddDialog from './item-add-dialog';
import ItemsViewDialog from './item-view-dialog';
import ItemsDeleteDialog from './item-delete-dialog';


// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'items.view',
  'items.manage',
  'items.edit',
  'items.delete',
];


const canView = can(
  'items.view',
  permissions
);

const canManage = can(
  'items.manage',
  permissions
);

const canEdit = can(
  'items.edit',
  permissions
);

const canDelete = can(
  'items.delete',
  permissions
);


// =======================================================
// ITEMS LIST
// =======================================================

const ItemsList = () => {
// =======================================================
// CURRENCY FORMAT
// =======================================================

const formatMoney = (value) => {

  const amount = Number(value || 0);


  return `$${amount.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;

};
// =======================================================
// STATIC ITEMS DATA
// =======================================================

const STATIC_Items = [
  {
    id: 4,
    description: 'Content Writing',
    longDescription:
      'Professional website and marketing content writing services.',
    rate: 800,
    tax1: '18%',
    tax2: '-',
    unit: 'Article',
    groupName: 'Content',
  },

  {
    id: 3,
    description: 'Website Maintenance',
    longDescription:
      'Regular website maintenance, updates, security checks and backups.',
    rate: 1200,
    tax1: '18%',
    tax2: '-',
    unit: 'Month',
    groupName: 'Maintenance',
  },

  {
    id: 2,
    description: 'Hosting Service',
    longDescription:
      'Managed web hosting service with SSL certificate and daily backups.',
    rate: 3000,
    tax1: '18%',
    tax2: '-',
    unit: 'Year',
    groupName: 'Hosting',
  },

  {
    id: 1,
    description: 'Domain Registration',
    longDescription:
      'Domain name registration and renewal service.',
    rate: 1200,
    tax1: '18%',
    tax2: '-',
    unit: 'Year',
    groupName: 'Domain',
  },
];
  // =======================================================
  // ITEMS STATE
  // =======================================================

  const [items, setItems] = useState(STATIC_Items);



  // =======================================================
  // DIALOG STATE
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] =
    useState(false);


  const [viewDialogOpen, setViewDialogOpen] =
    useState(false);


  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);


  const [selectedItem, setSelectedItem] =
    useState(null);



  // =======================================================
  // TABLE STATE
  // =======================================================

  const [pagination, setPagination] =
    useState({
      pageIndex: 0,
      pageSize: 10,
    });


  const [sorting, setSorting] =
    useState([
      {
        id: 'description',
        desc: false,
      },
    ]);



  // =======================================================
  // SEARCH
  // =======================================================

  const [searchQuery, setSearchQuery] =
    useState('');

// =======================================================
// FILTER DATA
// =======================================================

const filteredData = useMemo(() => {

  if (!searchQuery.trim()) {
    return items;
  }


  const search =
    searchQuery
      .toLowerCase()
      .trim();


  return items.filter((item) =>

    String(item.id)
      .toLowerCase()
      .includes(search)

    ||

    item.description
      .toLowerCase()
      .includes(search)

    ||

    item.longDescription
      .toLowerCase()
      .includes(search)

    ||

    String(item.rate)
      .toLowerCase()
      .includes(search)

    ||

    item.tax1
      .toLowerCase()
      .includes(search)

    ||

    item.tax2
      .toLowerCase()
      .includes(search)

    ||

    item.unit
      .toLowerCase()
      .includes(search)

    ||

    item.groupName
      .toLowerCase()
      .includes(search)

  );


}, [
  items,
  searchQuery,
]);

  // =======================================================
  // ROW SELECTION
  // =======================================================

  const [selectedRows, setSelectedRows] =
    useState({});



  // =======================================================
  // COPY ITEM
  // =======================================================

  const handleCopyItem = (item) => {

    const newItem = {

      ...item,

      id:
        Math.max(
          ...items.map(
            (currentItem) =>
              Number(currentItem.id)
          ),
          0
        ) + 1,


      description:
        `${item.description} - Copy`,
    };


    setItems((previous) => [
      newItem,
      ...previous,
    ]);

  };



  // =======================================================
  // VIEW ITEM
  // =======================================================

  const handleViewItem = (item) => {

    setSelectedItem(item);

    setViewDialogOpen(true);

  };



  // =======================================================
  // DELETE OPEN
  // =======================================================

  const handleDeleteItem = (item) => {

    if (!canDelete) {
      return;
    }


    setSelectedItem(item);

    setDeleteDialogOpen(true);

  };



  // =======================================================
  // DELETE CONFIRM
  // =======================================================

  const confirmDeleteItem = () => {

    if (!selectedItem) {
      return;
    }


    setItems((previous) =>
      previous.filter(
        (currentItem) =>
          currentItem.id !== selectedItem.id
      )
    );


    setDeleteDialogOpen(false);

    setSelectedItem(null);

  };



  // =======================================================
  // EDIT ITEM
  // =======================================================

  const handleEditItem = (item) => {

    console.log(
      'Edit Item:',
      item
    );

  };
  // =======================================================
// COLUMNS
// =======================================================

const columns = useMemo(
  () => [

    // ===================================================
    // CHECKBOX
    // ===================================================

    {
      id: 'select',

      header: ({ table }) => (
        <div className="checkbox mass_select_all_wrap">
          <input
            type="checkbox"
            id="mass_select_all"
            checked={
              table.getIsAllPageRowsSelected()
            }
            ref={(element) => {
              if (element) {
                element.indeterminate =
                  table.getIsSomePageRowsSelected();
              }
            }}
            onChange={(event) =>
              table.toggleAllPageRowsSelected(
                event.target.checked
              )
            }
          />

          <label htmlFor="mass_select_all" />
        </div>
      ),


      cell: ({ row }) => (
        <div className="checkbox">

          <input
            type="checkbox"
            checked={
              row.getIsSelected()
            }
            onChange={(event) =>
              row.toggleSelected(
                event.target.checked
              )
            }
          />

          <label />

        </div>
      ),


      size:50,

      enableSorting:false,

      enableHiding:false,

    },


    // ===================================================
    // DESCRIPTION
    // ===================================================

    {
      accessorKey:'description',

      id:'description',

      header:({column}) => (
        <DataGridColumnHeader
          title="Description"
          column={column}
          visibility
        />
      ),


      cell:({row}) => (
        <span className="font-medium">
          {row.original.description}
        </span>
      ),

      size:220,
    },



    // ===================================================
    // LONG DESCRIPTION
    // ===================================================

    {
      accessorKey:'longDescription',

      id:'longDescription',

      header:({column}) => (
        <DataGridColumnHeader
          title="Long Description"
          column={column}
          visibility
        />
      ),


      cell:({row}) => (

        <div
          className="max-w-[350px] truncate"
          title={
            row.original.longDescription
          }
        >
          {
            row.original.longDescription || '-'
          }

        </div>

      ),

      size:350,

    },



    // ===================================================
    // RATE
    // ===================================================

    {
      accessorKey:'rate',

      id:'rate',

      header:({column}) => (
        <DataGridColumnHeader
          title="Rate"
          column={column}
          visibility
        />
      ),


      cell:({row}) => (
        <span className="font-medium">
          {formatMoney(
            row.original.rate
          )}
        </span>
      ),

      size:140,

    },



    // ===================================================
    // TAX 1
    // ===================================================

    {
      accessorKey:'tax1',

      id:'tax1',

      header:({column}) => (
        <DataGridColumnHeader
          title="Tax 1"
          column={column}
          visibility
        />
      ),


      cell:({row}) => (
        <span>
          {
            row.original.tax1 || '-'
          }
        </span>
      ),

      size:120,

    },



    // ===================================================
    // TAX 2
    // ===================================================

    {
      accessorKey:'tax2',

      id:'tax2',

      header:({column}) => (
        <DataGridColumnHeader
          title="Tax 2"
          column={column}
          visibility
        />
      ),


      cell:({row}) => (
        <span>
          {
            row.original.tax2 || '-'
          }
        </span>
      ),

      size:120,

    },



    // ===================================================
    // UNIT
    // ===================================================

    {
      accessorKey:'unit',

      id:'unit',

      header:({column}) => (
        <DataGridColumnHeader
          title="Unit"
          column={column}
          visibility
        />
      ),


      cell:({row}) => (
        <span>
          {
            row.original.unit || '-'
          }
        </span>
      ),

      size:140,

    },



    // ===================================================
    // GROUP NAME
    // ===================================================

    {
      accessorKey:'groupName',

      id:'groupName',

      header:({column}) => (
        <DataGridColumnHeader
          title="Group Name"
          column={column}
          visibility
        />
      ),


      cell:({row}) => (
        <span>
          {
            row.original.groupName || '-'
          }
        </span>
      ),

      size:180,

    },



    // ===================================================
    // ACTIONS
    // ===================================================

    {
      id:'actions',

      header:'Actions',


      cell:({row}) => (

        <DropdownMenu>

          <DropdownMenuTrigger asChild>

            <Button
              className="h-7 w-7"
              mode="icon"
              variant="ghost"
            >
              <Ellipsis />
            </Button>

          </DropdownMenuTrigger>



          <DropdownMenuContent
            side="bottom"
            align="start"
          >


            {/* VIEW */}

            {
              canView && (

                <DropdownMenuItem
                  onClick={() =>
                    handleViewItem(
                      row.original
                    )
                  }
                >
                  View Item
                </DropdownMenuItem>

              )
            }




            {/* EDIT */}

            {
              canEdit && (

                <DropdownMenuItem
                  onClick={() =>
                    handleEditItem(
                      row.original
                    )
                  }
                >
                  Edit Item
                </DropdownMenuItem>

              )
            }





            {/* COPY */}

            {
              canManage && (

                <DropdownMenuItem
                  onClick={() =>
                    handleCopyItem(
                      row.original
                    )
                  }
                >

                  <Copy className="mr-2 h-4 w-4"/>

                  Copy Item

                </DropdownMenuItem>

              )
            }





            {/* DELETE */}

            {
              canDelete && (

                <>

                  <DropdownMenuSeparator />


                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      handleDeleteItem(
                        row.original
                      )
                    }
                  >

                    Delete Item

                  </DropdownMenuItem>


                </>

              )
            }


          </DropdownMenuContent>


        </DropdownMenu>

      ),


      size:75,

      enableSorting:false,

      enableResizing:false,

    },


  ],


  [
    items,
    canView,
    canManage,
    canEdit,
    canDelete
  ]

);
 // =======================================================
 // TABLE
 // =======================================================

 const table = useReactTable({

   columns,

   data: filteredData,


   pageCount: Math.ceil(
     filteredData.length /
     pagination.pageSize
   ),


   getRowId: (row) =>
     String(row.id),


   state: {

     pagination,

     sorting,

     rowSelection:selectedRows,

   },


   enableRowSelection:true,


   onPaginationChange:
     setPagination,


   onSortingChange:
     setSorting,


   onRowSelectionChange:
     setSelectedRows,


   getCoreRowModel:
     getCoreRowModel(),


   getSortedRowModel:
     getSortedRowModel(),


   getPaginationRowModel:
     getPaginationRowModel(),


   manualPagination:false,

   manualSorting:false,

 });





 // =======================================================
 // TOOLBAR
 // =======================================================

 const DataGridToolbar = () => {


   const [
     inputValue,
     setInputValue
   ] = useState(searchQuery);



   const handleSearch = () => {


     setSearchQuery(
       inputValue.trim()
     );


     setPagination(
       (previous)=>({

         ...previous,

         pageIndex:0,

       })
     );


   };



   const handleClearSearch = () => {


     setInputValue('');

     setSearchQuery('');


     setPagination(
       (previous)=>({

         ...previous,

         pageIndex:0,

       })
     );


   };



   return (

     <CardHeader className="py-5">


       {/* SEARCH */}

       <div className="flex items-center gap-2.5">


         <div className="relative">


           <Search
             className="
             absolute start-3 top-1/2
             size-4 -translate-y-1/2
             text-muted-foreground
             "
           />


           <Input

             placeholder="Search items"


             value={inputValue}


             onChange={(event)=>
               setInputValue(
                 event.target.value
               )
             }


             onKeyDown={(event)=>{

               if(event.key === 'Enter')
               {
                 handleSearch();
               }

             }}


             className="
             ps-9 w-full md:w-64
             "

           />



           {
             inputValue.length > 0 && (

               <Button

                 type="button"

                 mode="icon"

                 variant="dim"


                 className="
                 absolute end-1.5
                 top-1/2
                 h-6 w-6
                 -translate-y-1/2
                 "


                 onClick={
                   handleClearSearch
                 }

               >

                 <X/>

               </Button>

             )
           }



         </div>


       </div>





       {/* ADD ITEM */}


       {
         canManage && (

           <div className="flex items-center gap-3">


             <Button

               onClick={()=>
                 setAddDialogOpen(true)
               }

             >

               <Plus/>

               Add Item


             </Button>


           </div>

         )
       }



     </CardHeader>

   );

 };





 // =======================================================
 // ACCESS DENIED
 // =======================================================

 if(!canView)
 {

   return (

     <Card>

       <CardHeader>


         <div>


           <h3 className="text-lg font-semibold">

             Access Denied

           </h3>


           <p className="
           mt-1 text-sm text-muted-foreground
           ">

             You do not have permission
             to view Items.

           </p>


         </div>


       </CardHeader>


     </Card>

   );

 }





 // =======================================================
 // RENDER
 // =======================================================


 return (

   <>


     <DataGrid

       table={table}


       recordCount={
         filteredData.length
       }


       isLoading={false}


       tableLayout={{

         columnsResizable:true,

         columnsPinnable:true,

         columnsMovable:true,

         columnsVisibility:true,

       }}


       tableClassNames={{

         edgeCell:'px-5',

       }}

     >


       <Card>


         <DataGridToolbar />



         <CardTable>


           <ScrollArea>


             <DataGridTable />


             <ScrollBar
               orientation="horizontal"
             />


           </ScrollArea>


         </CardTable>




         <CardFooter>


           <DataGridPagination />


         </CardFooter>



       </Card>



     </DataGrid>





     {/* ADD DIALOG */}


     <ItemsAddDialog

       open={addDialogOpen}


       closeDialog={()=>{

         setAddDialogOpen(false);

       }}


       onSuccess={()=>{

         setAddDialogOpen(false);

       }}

     />





     {/* VIEW DIALOG */}


     <ItemsViewDialog


       open={viewDialogOpen}


       item={selectedItem}


       closeDialog={()=>{


         setViewDialogOpen(false);


         setSelectedItem(null);


       }}


     />






     {/* DELETE DIALOG */}


     <ItemsDeleteDialog


       open={deleteDialogOpen}


       item={selectedItem}


       closeDialog={()=>{


         setDeleteDialogOpen(false);


         setSelectedItem(null);


       }}



       onConfirm={
         confirmDeleteItem
       }


     />



   </>

 );

};


export default ItemsList;